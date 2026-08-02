<?php

namespace App\Application\Inventory;

use App\Models\Event;
use App\Models\InventoryItem;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function move(
        Event $event,
        InventoryItem $item,
        User $user,
        string $type,
        float $quantity,
        ?string $reason = null,
        ?PurchaseOrder $purchaseOrder = null,
    ): StockMovement {
        $delta = match ($type) {
            'receipt' => abs($quantity),
            'issue' => -abs($quantity),
            'adjustment' => $quantity,
            default => throw ValidationException::withMessages(['type' => 'Type de mouvement invalide.']),
        };
        $movement = DB::transaction(function () use ($event, $item, $user, $type, $delta, $reason, $purchaseOrder) {
            $locked = InventoryItem::query()->lockForUpdate()->findOrFail($item->id);
            $after = round((float) $locked->current_quantity + $delta, 3);
            if ($after < 0) {
                return null;
            }

            $locked->update(['current_quantity' => $after]);

            return StockMovement::query()->create([
                'organization_id' => $event->organization_id,
                'event_id' => $event->id,
                'inventory_item_id' => $locked->id,
                'purchase_order_id' => $purchaseOrder?->id,
                'type' => $type,
                'quantity_delta' => $delta,
                'quantity_after' => $after,
                'reason' => $reason,
                'created_by_user_id' => $user->id,
            ]);
        });

        if (! $movement) {
            throw ValidationException::withMessages([
                'quantity' => 'Le mouvement ferait passer le stock sous zéro.',
            ]);
        }

        return $movement;
    }

    public function receivePurchaseOrder(Event $event, PurchaseOrder $order, User $user): PurchaseOrder
    {
        $result = DB::transaction(function () use ($event, $order, $user) {
            $locked = PurchaseOrder::query()->lockForUpdate()->findOrFail($order->id);
            if ($locked->status === 'received') {
                return $locked;
            }
            if ($locked->status !== 'approved') {
                return null;
            }

            $locked->load('items.inventoryItem');
            foreach ($locked->items as $line) {
                $this->move(
                    $event,
                    $line->inventoryItem,
                    $user,
                    'receipt',
                    (float) $line->quantity,
                    "Réception {$locked->reference}",
                    $locked,
                );
                $line->inventoryItem->update(['unit_cost_minor' => $line->unit_cost_minor]);
            }
            $locked->update(['status' => 'received', 'received_at' => now()]);

            return $locked->fresh(['supplier', 'items.inventoryItem']);
        });

        if (! $result) {
            throw ValidationException::withMessages([
                'status' => 'Seul un achat approuvé peut être réceptionné.',
            ]);
        }

        return $result;
    }
}
