<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventType extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'custom_fields_schema' => 'array',
            'pricing_metadata' => 'array',
            'limits' => 'array',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EventCategory::class, 'event_category_id');
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(EventModuleDefinition::class, 'event_type_modules', 'event_type_id', 'module_id')
            ->withPivot([
                'recommendation_level',
                'default_enabled',
                'configuration_defaults',
                'sort_order',
            ]);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function invitationTemplates(): HasMany
    {
        return $this->hasMany(InvitationTemplate::class);
    }
}
