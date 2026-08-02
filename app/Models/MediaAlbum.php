<?php

namespace App\Models;

use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MediaAlbum extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function photos(): HasMany
    {
        return $this->hasMany(PhotoModel::class);
    }
}
