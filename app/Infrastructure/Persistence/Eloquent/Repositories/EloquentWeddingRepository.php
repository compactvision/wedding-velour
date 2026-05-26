<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\Wedding;
use App\Domain\Wedding\Repositories\WeddingRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;

class EloquentWeddingRepository implements WeddingRepositoryInterface
{
    public function find(string $id): ?Wedding
    {
        $model = WeddingModel::find($id);
        return $model ? $this->toDomain($model) : null;
    }

    public function save(Wedding $wedding): void
    {
        WeddingModel::updateOrCreate(
            ['id' => $wedding->id ?? (string) \Illuminate\Support\Str::uuid()],
            [
                'title'         => $wedding->title,
                'date'          => $wedding->date,
                'venue'         => $wedding->venue,
                'venue_address' => $wedding->venueAddress,
                'cover_image'   => $wedding->coverImage,
                'status'        => $wedding->status,
                'max_guests'    => $wedding->maxGuests,
                'notes'         => $wedding->notes,
            ]
        );
    }

    public function delete(string $id): void
    {
        WeddingModel::destroy($id);
    }

    public function all(): array
    {
        return WeddingModel::orderByDesc('created_at')
            ->get()
            ->map(fn($m) => $this->toDomain($m))
            ->all();
    }

    private function toDomain(WeddingModel $m): Wedding
    {
        return new Wedding(
            id: $m->id,
            title: $m->title,
            date: $m->date,
            venue: $m->venue,
            venueAddress: $m->venue_address,
            coverImage: $m->cover_image,
            status: $m->status,
            maxGuests: $m->max_guests,
            notes: $m->notes,
        );
    }
}
