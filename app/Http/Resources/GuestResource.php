<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_id' => $this->event_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'role' => $this->role,
            'companions' => $this->companions,
            'dietary_restrictions' => $this->dietary_restrictions,
            'drink_preference' => $this->drink_preference,
            'menu_preferences' => $this->menu_preferences ?? [],
            'qr_code' => $this->qr_code,
            'invitation_link' => $this->invitation_link,
            'rsvp_message' => $this->rsvp_message,
            'table_id' => $this->table_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
