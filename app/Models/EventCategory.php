<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventCategory extends Model
{
    use HasUuids;

    protected $guarded = [];

    public function eventTypes(): HasMany
    {
        return $this->hasMany(EventType::class);
    }
}
