<?php

namespace App\Application\Catering;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;

class CateringSummaryService
{
    /**
     * @return array<string, mixed>
     */
    public function forEvent(Event $event): array
    {
        $menuItems = MenuItemModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        $guests = GuestModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->where('status', 'confirmed')
            ->get();
        $preferenceCounts = [];
        foreach ($guests as $guest) {
            foreach ($guest->menu_preferences ?? [] as $menuItemId) {
                $preferenceCounts[$menuItemId] = ($preferenceCounts[$menuItemId] ?? 0) + 1;
            }
        }
        $menuItems->each(function ($item) use ($preferenceCounts) {
            $item->setAttribute(
                'preference_count',
                $preferenceCounts[$item->id] ?? 0,
            );
        });
        $tables = WeddingTableModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->orderBy('name')
            ->get(['id', 'name']);
        $menuNames = $menuItems->pluck('name', 'id');
        $tableNeeds = $tables->map(function ($table) use ($guests, $menuNames) {
            $tableGuests = $guests->where('table_id', $table->id);
            $preferences = [];
            $restrictions = [];

            foreach ($tableGuests as $guest) {
                foreach ($guest->menu_preferences ?? [] as $menuItemId) {
                    $name = $menuNames[$menuItemId] ?? null;
                    if ($name) {
                        $preferences[$name] = ($preferences[$name] ?? 0) + 1;
                    }
                }
                if ($guest->dietary_restrictions) {
                    $restrictions[] = trim(
                        "{$guest->first_name} {$guest->last_name} : {$guest->dietary_restrictions}",
                    );
                }
            }

            return [
                'table_id' => $table->id,
                'table_name' => $table->name,
                'guest_groups' => $tableGuests->count(),
                'people' => $tableGuests->sum(
                    fn ($guest) => 1 + max(0, (int) $guest->companions),
                ),
                'preferences' => $preferences,
                'dietary_restrictions' => $restrictions,
            ];
        })->values();
        $dietaryAlerts = $guests
            ->filter(fn ($guest) => filled($guest->dietary_restrictions))
            ->count();
        $confirmedPeople = $guests->sum(
            fn ($guest) => 1 + max(0, (int) $guest->companions),
        );
        $pendingOrders = OrderModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->whereIn('status', ['pending', 'preparing'])
            ->count();

        return [
            'menu_items' => $menuItems,
            'summary' => [
                'menu_items' => $menuItems->count(),
                'available_items' => $menuItems->where('is_available', true)->count(),
                'confirmed_people' => $confirmedPeople,
                'preference_selections' => array_sum($preferenceCounts),
                'dietary_alerts' => $dietaryAlerts,
                'pending_orders' => $pendingOrders,
            ],
            'table_needs' => $tableNeeds,
        ];
    }
}
