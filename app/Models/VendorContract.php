<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorContract extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'value_minor' => 'integer',
            'starts_on' => 'date',
            'ends_on' => 'date',
            'signed_at' => 'immutable_datetime',
            'completed_at' => 'immutable_datetime',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(EventVendor::class, 'event_vendor_id');
    }

    public function installments(): HasMany
    {
        return $this->hasMany(ContractInstallment::class);
    }
}
