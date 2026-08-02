<?php

namespace App\Http\Controllers\Api;

use App\Application\Inventory\InventoryService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\InventoryItem;
use App\Models\Organization;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantInventoryController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeModule($event, 'stock', 'stock.view');
        $items = InventoryItem::query()
            ->where('event_id', $event->id)
            ->orderBy('name')
            ->get();
        $suppliers = Supplier::query()
            ->where('event_id', $event->id)
            ->orderBy('name')
            ->get();
        $orders = PurchaseOrder::query()
            ->where('event_id', $event->id)
            ->with(['supplier', 'items.inventoryItem'])
            ->latest()
            ->get();
        $movements = StockMovement::query()
            ->where('event_id', $event->id)
            ->with('item')
            ->latest()
            ->limit(30)
            ->get();

        return response()->json(['data' => [
            'summary' => [
                'item_count' => $items->count(),
                'low_stock_count' => $items->filter(
                    fn (InventoryItem $item) => (float) $item->current_quantity <= (float) $item->reorder_level,
                )->count(),
                'stock_value_minor' => $items->sum(
                    fn (InventoryItem $item) => (int) round((float) $item->current_quantity * $item->unit_cost_minor),
                ),
                'open_purchase_orders' => $orders->whereIn('status', ['draft', 'submitted', 'approved'])->count(),
            ],
            'items' => $items,
            'suppliers' => $suppliers,
            'purchase_orders' => $orders->map(fn (PurchaseOrder $order) => $this->serializeOrder($order)),
            'movements' => $movements->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'inventory_item_id' => $movement->inventory_item_id,
                'item_name' => $movement->item?->name,
                'type' => $movement->type,
                'quantity_delta' => (float) $movement->quantity_delta,
                'quantity_after' => (float) $movement->quantity_after,
                'reason' => $movement->reason,
                'created_at' => $movement->created_at?->toIso8601String(),
            ])->values(),
        ]]);
    }

    public function storeItem(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeModule($event, 'stock', 'stock.manage');
        $item = InventoryItem::query()->create([
            ...$this->itemData($request, $event),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'currency' => $organization->currency,
        ]);

        return response()->json(['data' => $item], Response::HTTP_CREATED);
    }

    public function updateItem(
        Request $request,
        Organization $organization,
        Event $event,
        InventoryItem $inventoryItem,
    ): JsonResponse {
        $this->authorizeModule($event, 'stock', 'stock.manage');
        $this->assertScope($inventoryItem, $organization, $event);
        $inventoryItem->update($this->itemData($request, $event, true, $inventoryItem));

        return response()->json(['data' => $inventoryItem->fresh()]);
    }

    public function destroyItem(
        Organization $organization,
        Event $event,
        InventoryItem $inventoryItem,
    ): Response {
        $this->authorizeModule($event, 'stock', 'stock.manage');
        $this->assertScope($inventoryItem, $organization, $event);
        abort_if($inventoryItem->movements()->exists(), 409, 'Un article avec des mouvements ne peut pas être supprimé.');
        $inventoryItem->delete();

        return response()->noContent();
    }

    public function storeMovement(
        Request $request,
        Organization $organization,
        Event $event,
        InventoryItem $inventoryItem,
        InventoryService $inventory,
    ): JsonResponse {
        $this->authorizeModule($event, 'stock', 'stock.manage');
        $this->assertScope($inventoryItem, $organization, $event);
        $data = $request->validate([
            'type' => ['required', Rule::in(['receipt', 'issue', 'adjustment'])],
            'quantity' => ['required', 'numeric', 'not_in:0', 'between:-999999999,999999999'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
        if ($data['type'] !== 'adjustment' && (float) $data['quantity'] < 0) {
            throw ValidationException::withMessages(['quantity' => 'La quantité doit être positive.']);
        }
        $movement = $inventory->move(
            $event,
            $inventoryItem,
            $request->user(),
            $data['type'],
            (float) $data['quantity'],
            $data['reason'] ?? null,
        );

        return response()->json(['data' => $movement], Response::HTTP_CREATED);
    }

    public function storeSupplier(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeModule($event, 'purchasing', 'purchasing.manage');
        $supplier = Supplier::query()->create([
            ...$request->validate([
                'name' => ['required', 'string', 'max:180'],
                'contact_name' => ['sometimes', 'nullable', 'string', 'max:180'],
                'email' => ['sometimes', 'nullable', 'email', 'max:255'],
                'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
                'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            ]),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
        ]);

        return response()->json(['data' => $supplier], Response::HTTP_CREATED);
    }

    public function storePurchaseOrder(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeModule($event, 'purchasing', 'purchasing.manage');
        $data = $request->validate([
            'supplier_id' => [
                'sometimes', 'nullable', 'uuid',
                Rule::exists('suppliers', 'id')->where('event_id', $event->id),
            ],
            'expected_on' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.inventory_item_id' => [
                'required', 'uuid', 'distinct',
                Rule::exists('inventory_items', 'id')->where('event_id', $event->id),
            ],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'items.*.unit_cost_minor' => ['required', 'integer', 'min:0', 'max:999999999999'],
        ]);

        $order = DB::transaction(function () use ($data, $organization, $event, $request) {
            $nextNumber = PurchaseOrder::query()->where('event_id', $event->id)->count() + 1;
            $order = PurchaseOrder::query()->create([
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'supplier_id' => $data['supplier_id'] ?? null,
                'reference' => sprintf('ACH-%04d', $nextNumber),
                'status' => 'draft',
                'currency' => $organization->currency,
                'expected_on' => $data['expected_on'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]);
            foreach ($data['items'] as $line) {
                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $order->id,
                    ...$line,
                ]);
            }

            return $order->load(['supplier', 'items.inventoryItem']);
        });

        return response()->json(['data' => $this->serializeOrder($order)], Response::HTTP_CREATED);
    }

    public function transitionPurchaseOrder(
        Request $request,
        Organization $organization,
        Event $event,
        PurchaseOrder $purchaseOrder,
        InventoryService $inventory,
    ): JsonResponse {
        $this->assertScope($purchaseOrder, $organization, $event);
        $action = $request->validate([
            'action' => ['required', Rule::in(['submit', 'approve', 'receive', 'cancel'])],
        ])['action'];
        $permission = in_array($action, ['approve', 'receive'], true)
            ? 'purchasing.approve'
            : 'purchasing.manage';
        $this->authorizeModule($event, 'purchasing', $permission);

        if ($action === 'receive') {
            $purchaseOrder = $inventory->receivePurchaseOrder(
                $event,
                $purchaseOrder,
                $request->user(),
            );
        } else {
            $expectedStatus = ['submit' => 'draft', 'approve' => 'submitted'][$action] ?? null;
            if ($action !== 'cancel' && $purchaseOrder->status !== $expectedStatus) {
                throw ValidationException::withMessages(['action' => 'Transition d’achat invalide.']);
            }
            if ($action === 'cancel' && $purchaseOrder->status === 'received') {
                throw ValidationException::withMessages(['action' => 'Un achat réceptionné ne peut pas être annulé.']);
            }
            $purchaseOrder->update(match ($action) {
                'submit' => ['status' => 'submitted'],
                'approve' => [
                    'status' => 'approved',
                    'approved_by_user_id' => $request->user()->id,
                    'approved_at' => now(),
                ],
                'cancel' => ['status' => 'cancelled'],
            });
            $purchaseOrder->load(['supplier', 'items.inventoryItem']);
        }

        return response()->json(['data' => $this->serializeOrder($purchaseOrder)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function itemData(
        Request $request,
        Event $event,
        bool $partial = false,
        ?InventoryItem $item = null,
    ): array {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$presence, 'string', 'max:180'],
            'sku' => [
                'sometimes', 'nullable', 'string', 'max:80',
                Rule::unique('inventory_items', 'sku')->where('event_id', $event->id)->ignore($item?->id),
            ],
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'unit' => ['sometimes', 'string', 'max:30'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0', 'max:999999999'],
            'unit_cost_minor' => ['sometimes', 'integer', 'min:0', 'max:999999999999'],
            'location' => ['sometimes', 'nullable', 'string', 'max:180'],
            'status' => ['sometimes', Rule::in(['active', 'archived'])],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeOrder(PurchaseOrder $order): array
    {
        return [
            'id' => $order->id,
            'supplier_id' => $order->supplier_id,
            'supplier_name' => $order->supplier?->name,
            'reference' => $order->reference,
            'status' => $order->status,
            'currency' => $order->currency,
            'expected_on' => $order->expected_on?->format('Y-m-d'),
            'notes' => $order->notes,
            'total_minor' => $order->items->sum(
                fn (PurchaseOrderItem $line) => (int) round((float) $line->quantity * $line->unit_cost_minor),
            ),
            'items' => $order->items->map(fn (PurchaseOrderItem $line) => [
                'id' => $line->id,
                'inventory_item_id' => $line->inventory_item_id,
                'item_name' => $line->inventoryItem?->name,
                'quantity' => (float) $line->quantity,
                'unit_cost_minor' => $line->unit_cost_minor,
            ])->values(),
            'approved_at' => $order->approved_at?->toIso8601String(),
            'received_at' => $order->received_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }

    private function authorizeModule(Event $event, string $module, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', $module)
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            "Le module {$module} n’est pas activé pour cet événement.",
        );
    }

    private function assertScope(Model $model, Organization $organization, Event $event): void
    {
        abort_unless(
            $model->getAttribute('organization_id') === $organization->id
            && $model->getAttribute('event_id') === $event->id,
            404,
        );
    }
}
