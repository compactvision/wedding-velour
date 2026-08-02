<?php

namespace App\Models;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Badge extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'issued_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(BadgeTemplate::class, 'badge_template_id');
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(GuestModel::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
