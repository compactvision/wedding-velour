<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SeatingTableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $occupiedSeats = $this->relationLoaded('guests')
            ? $this->guests->sum(fn ($guest) => 1 + max(0, (int) $guest->companions))
            : 0;

        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_id' => $this->event_id,
            'name' => $this->name,
            'capacity' => (int) $this->capacity,
            'position_x' => (float) $this->position_x,
            'position_y' => (float) $this->position_y,
            'shape' => $this->shape,
            'category' => $this->category,
            'assigned_server' => $this->assigned_server,
            'occupied_seats' => $occupiedSeats,
            'remaining_seats' => max(0, (int) $this->capacity - $occupiedSeats),
            'guests' => $this->relationLoaded('guests')
                ? GuestResource::collection($this->guests)
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
