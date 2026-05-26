<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\WeddingTable;
use App\Domain\Wedding\Repositories\WeddingTableRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;

class EloquentWeddingTableRepository implements WeddingTableRepositoryInterface
{
    public function find(string $id): ?WeddingTable
    {
        $m = WeddingTableModel::find($id);
        return $m ? $this->toDomain($m) : null;
    }

    public function save(WeddingTable $table): void
    {
        WeddingTableModel::updateOrCreate(
            ['id' => $table->id ?? (string) \Illuminate\Support\Str::uuid()],
            [
                'wedding_id'      => $table->weddingId,
                'name'            => $table->name,
                'capacity'        => $table->capacity,
                'position_x'      => $table->positionX,
                'position_y'      => $table->positionY,
                'shape'           => $table->shape,
                'assigned_server' => $table->assignedServer,
                'category'        => $table->category,
            ]
        );
    }

    public function delete(string $id): void
    {
        WeddingTableModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = WeddingTableModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }
        return $query->get()->map(fn($m) => $this->toDomain($m))->all();
    }

    private function toDomain(WeddingTableModel $m): WeddingTable
    {
        return new WeddingTable(
            id: $m->id,
            weddingId: $m->wedding_id,
            name: $m->name,
            capacity: $m->capacity,
            positionX: (float) $m->position_x,
            positionY: (float) $m->position_y,
            shape: $m->shape,
            assignedServer: $m->assigned_server,
            category: $m->category,
        );
    }
}
