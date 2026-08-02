<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_id' => $this->event_id,
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'scope' => $this->scope,
            'audience' => $this->audience,
            'channel' => $this->channel,
            'delivery_status' => $this->delivery_status,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'sent_at' => $this->sent_at?->toIso8601String(),
            'recipient_count' => (int) $this->recipient_count,
            'is_read' => (bool) $this->is_read,
            'action_url' => $this->action_url,
            'created_by' => $this->relationLoaded('creator')
                ? $this->creator?->only(['id', 'name'])
                : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
