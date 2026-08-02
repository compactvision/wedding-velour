<?php

namespace App\Infrastructure\Persistence\Eloquent;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeddingNotificationModel extends Model
{
    use HasUuids;

    protected $table = 'wedding_notifications';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'scheduled_at' => 'immutable_datetime',
            'sent_at' => 'immutable_datetime',
            'recipient_count' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
