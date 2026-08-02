<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_type' => [
                'id' => $this->type?->id,
                'name' => $this->type?->name,
                'slug' => $this->type?->slug,
            ],
            'name' => $this->name,
            'slug' => $this->slug,
            'status' => $this->status,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'timezone' => $this->timezone,
            'format' => $this->format,
            'venue_name' => $this->venue_name,
            'venue_address' => $this->venue_address,
            'estimated_guests' => $this->estimated_guests,
            'visibility' => $this->visibility,
            'modules' => $this->whenLoaded(
                'enabledModules',
                fn () => $this->enabledModules
                    ->where('pivot.status', 'enabled')
                    ->map(fn ($module) => [
                        'slug' => $module->slug,
                        'name' => $module->name,
                    ])
                    ->values(),
            ),
        ];
    }
}
