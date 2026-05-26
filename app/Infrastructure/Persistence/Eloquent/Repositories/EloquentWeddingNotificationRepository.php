<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\WeddingNotification;
use App\Domain\Wedding\Repositories\WeddingNotificationRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;

class EloquentWeddingNotificationRepository implements WeddingNotificationRepositoryInterface
{
    public function find(string $id): ?WeddingNotification
    {
        $m = WeddingNotificationModel::find($id);
        return $m ? $this->toDomain($m) : null;
    }

    public function save(WeddingNotification $notification): void
    {
        WeddingNotificationModel::updateOrCreate(
            ['id' => $notification->id ?? (string) \Illuminate\Support\Str::uuid()],
            [
                'wedding_id'  => $notification->weddingId,
                'title'       => $notification->title,
                'message'     => $notification->message,
                'type'        => $notification->type,
                'target_role' => $notification->targetRole,
                'is_read'     => $notification->isRead,
                'target_user' => $notification->targetUser,
            ]
        );
    }

    public function delete(string $id): void
    {
        WeddingNotificationModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = WeddingNotificationModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }
        return $query->orderByDesc('created_at')->get()->map(fn($m) => $this->toDomain($m))->all();
    }

    private function toDomain(WeddingNotificationModel $m): WeddingNotification
    {
        return new WeddingNotification(
            id: $m->id,
            weddingId: $m->wedding_id,
            title: $m->title,
            message: $m->message,
            type: $m->type,
            targetRole: $m->target_role,
            isRead: (bool) $m->is_read,
            targetUser: $m->target_user,
        );
    }
}
