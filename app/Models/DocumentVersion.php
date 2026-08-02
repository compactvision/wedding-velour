<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer', 'version_number' => 'integer'];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(EventDocument::class, 'event_document_id');
    }
}
