<?php

namespace App\Models;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckIn extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'checked_in_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
            'active_marker' => 'boolean',
        ];
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(GuestModel::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by_user_id');
    }
}
