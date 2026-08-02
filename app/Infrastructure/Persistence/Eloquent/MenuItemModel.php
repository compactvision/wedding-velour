<?php

namespace App\Infrastructure\Persistence\Eloquent;

use App\Models\Event;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItemModel extends Model
{
    use HasUuids;

    protected $table = 'menu_items';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'allergens' => 'array',
            'dietary_tags' => 'array',
            'unit_price' => 'decimal:2',
            'available_quantity' => 'integer',
            'remaining_quantity' => 'integer',
            'is_available' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(OrderModel::class, 'menu_item_id');
    }
}
