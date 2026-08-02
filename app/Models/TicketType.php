<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TicketType extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['price_minor' => 'integer', 'capacity' => 'integer', 'sold_count' => 'integer', 'sales_start_at' => 'immutable_datetime', 'sales_end_at' => 'immutable_datetime'];
    }
}
