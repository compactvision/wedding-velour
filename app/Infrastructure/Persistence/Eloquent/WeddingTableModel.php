<?php

namespace App\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeddingTableModel extends Model
{
    use HasUuids;

    protected $table = 'wedding_tables';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'position_x' => 'float',
            'position_y' => 'float',
        ];
    }

    public function guests(): HasMany
    {
        return $this->hasMany(GuestModel::class, 'table_id');
    }
}
