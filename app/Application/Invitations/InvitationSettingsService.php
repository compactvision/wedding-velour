<?php

namespace App\Application\Invitations;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Models\Event;
use App\Models\EventSetting;
use App\Models\InvitationTemplate;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvitationSettingsService
{
    private const FIELDS = [
        'eyebrow',
        'title',
        'greeting',
        'body',
        'rsvp_question',
        'accept_label',
        'decline_label',
        'footer',
        'background_image',
        'accent_color',
        'rsvp_deadline',
        'show_event_details',
    ];

    /**
     * @return array<string, mixed>
     */
    public function forEvent(Event $event): array
    {
        $event->loadMissing(['settings', 'type']);
        $legacy = $event->legacy_wedding_id
            ? WeddingModel::query()->find($event->legacy_wedding_id)?->invitation_custom
            : [];
        $branding = $event->settings?->branding ?? [];
        $publicPage = $event->settings?->public_page ?? [];

        return [
            ...$this->defaults($event),
            ...Arr::only(is_array($legacy) ? $legacy : [], self::FIELDS),
            ...Arr::only(is_array($branding) ? $branding : [], self::FIELDS),
            ...Arr::only($publicPage['invitation'] ?? [], self::FIELDS),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function templatesForEvent(Event $event): array
    {
        return InvitationTemplate::query()
            ->where('event_type_id', $event->event_type_id)
            ->where('status', 'active')
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (InvitationTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'slug' => $template->slug,
                'description' => $template->description,
                'is_default' => $template->is_default,
                'configuration' => [
                    ...$this->genericDefaults($event),
                    ...$template->configuration,
                    'title' => $event->name,
                ],
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $configuration
     * @return array<string, mixed>
     */
    public function save(Event $event, array $configuration): array
    {
        return DB::transaction(function () use ($event, $configuration) {
            $settings = EventSetting::query()->firstOrNew(['event_id' => $event->id]);
            $publicPage = $settings->public_page ?? [];
            $publicPage['invitation'] = [
                ...$this->forEvent($event),
                ...Arr::only($configuration, self::FIELDS),
            ];
            $publicPage['invitation_updated_at'] = now()->toIso8601String();

            $settings->fill([
                'id' => $settings->id ?: (string) Str::uuid(),
                'organization_id' => $event->organization_id,
                'locale' => $settings->locale ?: 'fr',
                'public_page' => $publicPage,
            ])->save();

            if ($event->legacy_wedding_id) {
                WeddingModel::query()
                    ->whereKey($event->legacy_wedding_id)
                    ->update(['invitation_custom' => $publicPage['invitation']]);
            }

            return $publicPage['invitation'];
        });
    }

    /**
     * @return array<string, int>
     */
    public function rsvpSummary(Event $event): array
    {
        $query = GuestModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id);

        $guests = (clone $query)->count();
        $confirmedGuests = (clone $query)->whereIn('status', ['confirmed', 'attending'])->count();
        $declinedGuests = (clone $query)->where('status', 'declined')->count();
        $pendingGuests = max(0, $guests - $confirmedGuests - $declinedGuests);
        $confirmedPeople = (clone $query)
            ->whereIn('status', ['confirmed', 'attending'])
            ->get(['companions'])
            ->sum(fn ($guest) => 1 + max(0, (int) $guest->companions));

        return [
            'guests' => $guests,
            'confirmed_guests' => $confirmedGuests,
            'confirmed_people' => $confirmedPeople,
            'declined_guests' => $declinedGuests,
            'pending_guests' => $pendingGuests,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function defaults(Event $event): array
    {
        $template = InvitationTemplate::query()
            ->where('event_type_id', $event->event_type_id)
            ->where('status', 'active')
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->first();

        return [
            ...$this->genericDefaults($event),
            ...($template?->configuration ?? []),
            'title' => $event->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function genericDefaults(Event $event): array
    {
        return [
            'eyebrow' => 'Vous êtes cordialement invité(e)',
            'title' => $event->name,
            'greeting' => 'Cher(e) {guest}',
            'body' => 'Nous serions honorés de partager ce moment avec vous. Rejoignez-nous pour vivre ensemble cet événement.',
            'rsvp_question' => 'Serez-vous présent(e) ?',
            'accept_label' => 'Oui, je serai là !',
            'decline_label' => 'Je ne pourrai pas venir',
            'footer' => 'Merci et à très vite',
            'background_image' => '',
            'accent_color' => $event->type?->primary_color ?: '#B98235',
            'rsvp_deadline' => null,
            'show_event_details' => true,
        ];
    }
}
