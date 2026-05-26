<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PhotoModel extends Model
{
    use HasUuids;

    protected $table = 'photos';
    protected $guarded = [];
    public $incrementing = false;
    protected $keyType = 'string';
}
