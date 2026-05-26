<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MenuItemModel extends Model
{
    use HasUuids;

    protected $table = 'menu_items';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
