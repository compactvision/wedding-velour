<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventDocument extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class);
    }

    public function documentVersions(): HasMany
    {
        return $this->versions();
    }
}
