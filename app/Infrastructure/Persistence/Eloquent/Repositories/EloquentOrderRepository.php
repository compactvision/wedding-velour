<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\Order;
use App\Domain\Wedding\Repositories\OrderRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use Illuminate\Support\Str;

class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function find(string $id): ?Order
    {
        $m = OrderModel::find($id);

        return $m ? $this->toDomain($m) : null;
    }

    public function save(Order $order): void
    {
        OrderModel::updateOrCreate(
            ['id' => $order->id ?? (string) Str::uuid()],
            [
                'wedding_id' => $order->weddingId,
                'offline_uuid' => $order->offlineUuid,
                'table_id' => $order->tableId,
                'table_name' => $order->tableName,
                'guest_id' => $order->guestId,
                'guest_name' => $order->guestName,
                'type' => $order->type,
                'description' => $order->description,
                'status' => $order->status,
                'priority' => $order->priority,
                'assigned_server' => $order->assignedServer,
                'notes' => $order->notes,
            ]
        );
    }

    public function delete(string $id): void
    {
        OrderModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = OrderModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }

        return $query->get()->map(fn ($m) => $this->toDomain($m))->all();
    }

    private function toDomain(OrderModel $m): Order
    {
        return new Order(
            id: $m->id,
            weddingId: $m->wedding_id,
            offlineUuid: $m->offline_uuid,
            tableId: $m->table_id,
            tableName: $m->table_name,
            guestId: $m->guest_id,
            guestName: $m->guest_name,
            type: $m->type,
            description: $m->description,
            status: $m->status,
            priority: $m->priority,
            assignedServer: $m->assigned_server,
            notes: $m->notes,
        );
    }
}
