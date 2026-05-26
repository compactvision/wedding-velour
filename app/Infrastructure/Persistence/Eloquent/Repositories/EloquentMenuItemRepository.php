<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\MenuItem;
use App\Domain\Wedding\Repositories\MenuItemRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;

class EloquentMenuItemRepository implements MenuItemRepositoryInterface
{
    public function find(string $id): ?MenuItem
    {
        $m = MenuItemModel::find($id);
        return $m ? $this->toDomain($m) : null;
    }

    public function save(MenuItem $item): void
    {
        MenuItemModel::updateOrCreate(
            ['id' => $item->id ?? (string) \Illuminate\Support\Str::uuid()],
            [
                'wedding_id'          => $item->weddingId,
                'name'                => $item->name,
                'emoji'               => $item->emoji,
                'category'            => $item->category,
                'description'         => $item->description,
                'available_quantity'  => $item->availableQuantity,
                'remaining_quantity'  => $item->remainingQuantity,
                'is_available'        => $item->isAvailable,
                'sort_order'          => $item->sortOrder,
            ]
        );
    }

    public function delete(string $id): void
    {
        MenuItemModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = MenuItemModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }
        return $query->orderBy('sort_order')->get()->map(fn($m) => $this->toDomain($m))->all();
    }

    private function toDomain(MenuItemModel $m): MenuItem
    {
        return new MenuItem(
            id: $m->id,
            weddingId: $m->wedding_id,
            name: $m->name,
            emoji: $m->emoji,
            category: $m->category,
            description: $m->description,
            availableQuantity: $m->available_quantity,
            remainingQuantity: $m->remaining_quantity,
            isAvailable: (bool) $m->is_available,
            sortOrder: $m->sort_order,
        );
    }
}
