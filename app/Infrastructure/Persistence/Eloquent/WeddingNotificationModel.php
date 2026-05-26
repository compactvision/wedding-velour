<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WeddingNotificationModel extends Model
{
    use HasUuids;

    protected $table = 'wedding_notifications';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
