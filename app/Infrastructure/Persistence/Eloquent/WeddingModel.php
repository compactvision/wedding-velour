<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WeddingModel extends Model
{
    use HasUuids;

    protected $table = 'weddings';

    protected $guarded = [];

    protected $casts = [
        'invitation_custom' => 'array',
    ];

    public $incrementing = false;

    protected $keyType = 'string';
}
