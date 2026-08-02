<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Models\Badge;
use App\Models\BadgeTemplate;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantBadgeController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeBadges($event, 'badges.view');

        $templates = BadgeTemplate::query()
            ->where('event_id', $event->id)
            ->orderBy('name')
            ->get();
        $badges = Badge::query()
            ->where('event_id', $event->id)
            ->with(['template', 'guest:id,first_name,last_name', 'ticket:id,holder_name'])
            ->latest('issued_at')
            ->get();
        $guests = GuestModel::query()
            ->where('event_id', $event->id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'role']);
        $tickets = Ticket::query()
            ->where('event_id', $event->id)
            ->whereIn('status', ['issued', 'used'])
            ->orderBy('holder_name')
            ->get(['id', 'holder_name', 'status']);

        return response()->json(['data' => [
            'summary' => [
                'total' => $badges->count(),
                'issued' => $badges->where('status', 'issued')->count(),
                'revoked' => $badges->where('status', 'revoked')->count(),
                'templates' => $templates->where('status', 'active')->count(),
            ],
            'templates' => $templates,
            'badges' => $badges->map(fn (Badge $badge) => $this->serializeBadge($badge)),
            'candidates' => [
                'guests' => $guests->map(fn (GuestModel $guest) => [
                    'id' => $guest->id,
                    'name' => trim("{$guest->first_name} {$guest->last_name}"),
                    'role' => $guest->role,
                ]),
                'tickets' => $tickets->map(fn (Ticket $ticket) => [
                    'id' => $ticket->id,
                    'name' => $ticket->holder_name,
                    'status' => $ticket->status,
                ]),
            ],
        ]]);
    }

    public function storeTemplate(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeBadges($event, 'badges.manage');
        $template = BadgeTemplate::query()->create([
            ...$this->validatedTemplate($request, $event),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $template], Response::HTTP_CREATED);
    }

    public function updateTemplate(
        Request $request,
        Organization $organization,
        Event $event,
        BadgeTemplate $badgeTemplate,
    ): JsonResponse {
        $this->authorizeBadges($event, 'badges.manage');
        $this->assertTemplateScope($badgeTemplate, $organization, $event);
        $badgeTemplate->update($this->validatedTemplate($request, $event, $badgeTemplate));

        return response()->json(['data' => $badgeTemplate->fresh()]);
    }

    public function issue(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeBadges($event, 'badges.issue');
        $data = $request->validate([
            'source_type' => ['required', Rule::in(['guest', 'ticket'])],
            'source_id' => ['required', 'uuid'],
            'badge_template_id' => [
                'nullable',
                'uuid',
                Rule::exists('badge_templates', 'id')->where('event_id', $event->id),
            ],
            'holder_role' => ['nullable', 'string', 'max:120'],
        ]);

        [$subject, $holderName] = $this->resolveSubject($data['source_type'], $data['source_id'], $event);
        $subjectColumn = $data['source_type'].'_id';
        $otherColumn = $data['source_type'] === 'guest' ? 'ticket_id' : 'guest_id';

        $badge = DB::transaction(function () use (
            $data,
            $organization,
            $event,
            $request,
            $subject,
            $subjectColumn,
            $otherColumn,
            $holderName,
        ) {
            $badge = Badge::query()
                ->where('event_id', $event->id)
                ->where($subjectColumn, $subject->id)
                ->lockForUpdate()
                ->first();

            if (! $badge) {
                $badge = new Badge([
                    'organization_id' => $organization->id,
                    'event_id' => $event->id,
                    $subjectColumn => $subject->id,
                    $otherColumn => null,
                    'code' => hash('sha256', Str::uuid().Str::random(32)),
                ]);
            }

            $badge->fill([
                'badge_template_id' => $data['badge_template_id'] ?? null,
                'holder_name' => $holderName,
                'holder_role' => $data['holder_role'] ?? null,
                'status' => 'issued',
                'issued_at' => now(),
                'revoked_at' => null,
                'issued_by_user_id' => $request->user()->id,
            ])->save();

            return $badge->load(['template', 'guest:id,first_name,last_name', 'ticket:id,holder_name']);
        });

        return response()->json(['data' => $this->serializeBadge($badge)], Response::HTTP_CREATED);
    }

    public function revoke(
        Request $request,
        Organization $organization,
        Event $event,
        Badge $badge,
    ): JsonResponse {
        $this->authorizeBadges($event, 'badges.issue');
        $this->assertBadgeScope($badge, $organization, $event);
        if ($badge->status !== 'revoked') {
            $badge->update(['status' => 'revoked', 'revoked_at' => now()]);
        }

        return response()->json(['data' => $this->serializeBadge($badge->fresh(['template', 'guest', 'ticket']))]);
    }

    private function validatedTemplate(
        Request $request,
        Event $event,
        ?BadgeTemplate $template = null,
    ): array {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('badge_templates')->where('event_id', $event->id)->ignore($template?->id),
            ],
            'format' => ['required', Rule::in(['portrait', 'landscape'])],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'show_qr' => ['required', 'boolean'],
            'show_organization' => ['required', 'boolean'],
            'status' => ['sometimes', Rule::in(['active', 'archived'])],
        ]);
    }

    /**
     * @return array{0: GuestModel|Ticket, 1: string}
     */
    private function resolveSubject(string $sourceType, string $sourceId, Event $event): array
    {
        if ($sourceType === 'guest') {
            $guest = GuestModel::query()
                ->where('event_id', $event->id)
                ->find($sourceId);
            if (! $guest) {
                throw ValidationException::withMessages(['source_id' => 'Cet invité ne fait pas partie de l’événement.']);
            }

            return [$guest, trim("{$guest->first_name} {$guest->last_name}")];
        }

        $ticket = Ticket::query()
            ->where('event_id', $event->id)
            ->whereIn('status', ['issued', 'used'])
            ->find($sourceId);
        if (! $ticket) {
            throw ValidationException::withMessages(['source_id' => 'Ce billet ne peut pas recevoir de badge.']);
        }

        return [$ticket, $ticket->holder_name];
    }

    private function authorizeBadges(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id && $context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'badges')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
        );
    }

    private function assertTemplateScope(BadgeTemplate $template, Organization $organization, Event $event): void
    {
        abort_unless(
            $template->organization_id === $organization->id && $template->event_id === $event->id,
            404,
        );
    }

    private function assertBadgeScope(Badge $badge, Organization $organization, Event $event): void
    {
        abort_unless(
            $badge->organization_id === $organization->id && $badge->event_id === $event->id,
            404,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeBadge(Badge $badge): array
    {
        return [
            'id' => $badge->id,
            'holder_name' => $badge->holder_name,
            'holder_role' => $badge->holder_role,
            'code' => $badge->code,
            'status' => $badge->status,
            'source_type' => $badge->guest_id ? 'guest' : 'ticket',
            'source_id' => $badge->guest_id ?: $badge->ticket_id,
            'template' => $badge->template,
            'issued_at' => $badge->issued_at?->toIso8601String(),
            'revoked_at' => $badge->revoked_at?->toIso8601String(),
        ];
    }
}
