<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BadgeTemplate extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'show_qr' => 'boolean',
            'show_organization' => 'boolean',
        ];
    }

    public function badges(): HasMany
    {
        return $this->hasMany(Badge::class);
    }
}
