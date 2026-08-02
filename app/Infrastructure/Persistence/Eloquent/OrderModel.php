<?php

namespace App\Infrastructure\Persistence\Eloquent;

use App\Models\Event;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderModel extends Model
{
    use HasUuids;

    protected $table = 'orders';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItemModel::class, 'menu_item_id');
    }
}
