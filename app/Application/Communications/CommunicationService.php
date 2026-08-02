<?php

namespace App\Application\Communications;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Models\Event;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CommunicationService
{
    public function publish(WeddingNotificationModel $communication): WeddingNotificationModel
    {
        if ($communication->scope !== 'campaign') {
            throw ValidationException::withMessages([
                'communication' => 'Seules les communications peuvent être publiées.',
            ]);
        }

        return DB::transaction(function () use ($communication) {
            $communication = WeddingNotificationModel::query()
                ->whereKey($communication->id)
                ->lockForUpdate()
                ->firstOrFail();
            if ($communication->delivery_status === 'sent') {
                return $communication;
            }

            $event = Event::query()->findOrFail($communication->event_id);
            $communication->update([
                'delivery_status' => 'sent',
                'sent_at' => now(),
                'recipient_count' => $this->recipientCount(
                    $event,
                    $communication->audience,
                ),
            ]);

            return $communication->fresh(['creator:id,name']);
        });
    }

    public function dispatchDue(): int
    {
        $communications = WeddingNotificationModel::query()
            ->where('scope', 'campaign')
            ->where('delivery_status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($communications as $communication) {
            $this->publish($communication);
        }

        return $communications->count();
    }

    public function recipientCount(Event $event, string $audience): int
    {
        if ($audience === 'team') {
            return $event->members()->where('status', 'active')->count();
        }

        $query = GuestModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id);

        return match ($audience) {
            'confirmed_guests' => $query->where('status', 'confirmed')->count(),
            'pending_rsvp' => $query->where('status', 'invited')->count(),
            default => $query->whereNotIn('status', ['declined', 'absent'])->count(),
        };
    }
}
