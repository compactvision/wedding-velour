<?php

namespace App\Infrastructure\Persistence\Eloquent;

use App\Models\MediaAlbum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoModel extends Model
{
    use HasUuids;

    protected $table = 'photos';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return ['is_featured' => 'boolean', 'size_bytes' => 'integer', 'published_at' => 'immutable_datetime'];
    }

    public function album(): BelongsTo
    {
        return $this->belongsTo(MediaAlbum::class, 'media_album_id');
    }
}
