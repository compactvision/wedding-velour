<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $timezone = $this->relationLoaded('event')
            ? ($this->event?->timezone ?: 'UTC')
            : 'UTC';

        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'event_id' => $this->event_id,
            'title' => $this->title,
            'description' => $this->description,
            'starts_at' => $this->starts_at?->setTimezone($timezone)->toIso8601String(),
            'ends_at' => $this->ends_at?->setTimezone($timezone)->toIso8601String(),
            'time' => $this->starts_at?->setTimezone($timezone)->format('H:i') ?: $this->time,
            'category' => $this->category,
            'status' => $this->status,
            'location' => $this->location,
            'responsible_name' => $this->responsible_name,
            'visibility' => $this->visibility,
            'notify_all' => (bool) $this->notify_all,
            'image_url' => $this->image_url,
            'sub_details' => $this->sub_details ?? [],
            'sort_order' => (int) $this->sort_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
