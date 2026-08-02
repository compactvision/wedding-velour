<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CateringMenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_id' => $this->event_id,
            'name' => $this->name,
            'emoji' => $this->emoji,
            'category' => $this->category,
            'description' => $this->description,
            'available_quantity' => (int) $this->available_quantity,
            'remaining_quantity' => (int) $this->remaining_quantity,
            'is_available' => (bool) $this->is_available,
            'sort_order' => (int) $this->sort_order,
            'allergens' => $this->allergens ?? [],
            'dietary_tags' => $this->dietary_tags ?? [],
            'unit_price' => $this->unit_price !== null
                ? (float) $this->unit_price
                : null,
            'service_period' => $this->service_period,
            'preference_count' => (int) ($this->preference_count ?? 0),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
