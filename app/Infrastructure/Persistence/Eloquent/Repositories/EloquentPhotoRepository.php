<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\Photo;
use App\Domain\Wedding\Repositories\PhotoRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\PhotoModel;

class EloquentPhotoRepository implements PhotoRepositoryInterface
{
    public function find(string $id): ?Photo
    {
        $m = PhotoModel::find($id);
        return $m ? $this->toDomain($m) : null;
    }

    public function save(Photo $photo): void
    {
        PhotoModel::updateOrCreate(
            ['id' => $photo->id ?? (string) \Illuminate\Support\Str::uuid()],
            [
                'wedding_id'    => $photo->weddingId,
                'url'           => $photo->url,
                'thumbnail_url' => $photo->thumbnailUrl,
                'caption'       => $photo->caption,
                'uploaded_by'   => $photo->uploadedBy,
                'category'      => $photo->category,
                'is_featured'   => $photo->isFeatured,
            ]
        );
    }

    public function delete(string $id): void
    {
        PhotoModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = PhotoModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }
        return $query->get()->map(fn($m) => $this->toDomain($m))->all();
    }

    private function toDomain(PhotoModel $m): Photo
    {
        return new Photo(
            id: $m->id,
            weddingId: $m->wedding_id,
            url: $m->url,
            thumbnailUrl: $m->thumbnail_url,
            caption: $m->caption,
            uploadedBy: $m->uploaded_by,
            category: $m->category,
            isFeatured: (bool) $m->is_featured,
        );
    }
}
