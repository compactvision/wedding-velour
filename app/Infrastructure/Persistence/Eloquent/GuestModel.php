<?php

namespace App\Infrastructure\Persistence\Eloquent;

use App\Models\CheckIn;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuestModel extends Model
{
    use HasUuids;

    protected $table = 'guests';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $casts = [
        'menu_preferences' => 'array',
        'companions' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function checkIns(): HasMany
    {
        return $this->hasMany(CheckIn::class, 'guest_id');
    }
}
