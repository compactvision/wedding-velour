<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TimelineEventModel extends Model
{
    use HasUuids;

    protected $table = 'timeline_events';
    protected $guarded = [];
    protected $casts = [
        'sub_details' => 'array',
    ];
    public $incrementing = false;
    protected $keyType = 'string';
}
