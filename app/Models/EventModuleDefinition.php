<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EventModuleDefinition extends Model
{
    use HasUuids;

    protected $table = 'modules';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'dependencies' => 'array',
            'configuration_schema' => 'array',
        ];
    }
}
