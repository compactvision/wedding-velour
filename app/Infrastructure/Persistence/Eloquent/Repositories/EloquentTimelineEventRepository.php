<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\TimelineEvent;
use App\Domain\Wedding\Repositories\TimelineEventRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use Illuminate\Support\Str;

class EloquentTimelineEventRepository implements TimelineEventRepositoryInterface
{
    public function find(string $id): ?TimelineEvent
    {
        $m = TimelineEventModel::find($id);

        return $m ? $this->toDomain($m) : null;
    }

    public function save(TimelineEvent $event): void
    {
        TimelineEventModel::updateOrCreate(
            ['id' => $event->id ?? (string) Str::uuid()],
            [
                'wedding_id' => $event->weddingId,
                'title' => $event->title,
                'description' => $event->description,
                'image_url' => $event->imageUrl,
                'sub_details' => $event->subDetails,
                'time' => $event->time,
                'category' => $event->category,
                'status' => $event->status,
                'notify_all' => $event->notifyAll,
            ]
        );
    }

    public function delete(string $id): void
    {
        TimelineEventModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = TimelineEventModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }

        return $query->orderBy('time')->get()->map(fn ($m) => $this->toDomain($m))->all();
    }

    private function toDomain(TimelineEventModel $m): TimelineEvent
    {
        return new TimelineEvent(
            id: $m->id,
            weddingId: $m->wedding_id,
            title: $m->title,
            description: $m->description,
            imageUrl: $m->image_url,
            subDetails: $m->sub_details,
            time: $m->time,
            category: $m->category,
            status: $m->status,
            notifyAll: (bool) $m->notify_all,
        );
    }
}
