<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OrderModel extends Model
{
    use HasUuids;

    protected $table = 'orders';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
