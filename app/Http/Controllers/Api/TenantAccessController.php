<?php

namespace App\Http\Controllers\Api;

use App\Application\Seating\SeatingService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\CheckIn;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantAccessController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
        SeatingService $seating,
    ): JsonResponse {
        $this->authorizeAccess($event, 'checkins.view', true);

        $guests = GuestModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->with([
                'checkIns' => fn ($query) => $query
                    ->whereNull('revoked_at')
                    ->latest('checked_in_at'),
            ])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();
        $tables = WeddingTableModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->orderBy('name')
            ->get();
        $recent = CheckIn::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->whereNull('revoked_at')
            ->with(['guest', 'operator'])
            ->latest('checked_in_at')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => [
                'guests' => $guests->map(fn (GuestModel $guest) => $this->guestData($guest)),
                'tables' => $tables->map(fn (WeddingTableModel $table) => [
                    'id' => $table->id,
                    'name' => $table->name,
                    'shape' => $table->shape,
                    'position_x' => $table->position_x,
                    'position_y' => $table->position_y,
                ]),
                'room_polygon' => $seating->roomPolygon($event),
                'summary' => $this->summary($guests),
                'recent' => $recent->map(fn (CheckIn $checkIn) => $this->checkInData($checkIn)),
            ],
        ]);
    }

    public function lookup(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeAccess($event, 'checkins.scan');
        $data = $request->validate(['token' => ['required', 'string', 'max:2048']]);
        $token = $this->extractToken($data['token']);

        $guest = GuestModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->where(function ($query) use ($token) {
                $query->where('qr_code', $token)
                    ->orWhere('invitation_link', $token);
            })
            ->with([
                'checkIns' => fn ($query) => $query
                    ->whereNull('revoked_at')
                    ->latest('checked_in_at'),
            ])
            ->first();

        abort_unless($guest, 404, 'Ce QR code ne correspond à aucun invité de cet événement.');

        return response()->json(['data' => $this->guestData($guest)]);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeAccess($event, 'checkins.scan');
        $data = $request->validate([
            'guest_id' => [
                'required',
                'uuid',
                Rule::exists('guests', 'id')->where('event_id', $event->id),
            ],
            'method' => ['required', Rule::in(['qr', 'manual'])],
            'checkpoint' => ['sometimes', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        [$checkIn, $alreadyPresent] = DB::transaction(function () use (
            $data,
            $organization,
            $event,
            $request,
        ) {
            $guest = GuestModel::query()
                ->where('organization_id', $organization->id)
                ->where('event_id', $event->id)
                ->lockForUpdate()
                ->findOrFail($data['guest_id']);

            if ($guest->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'guest_id' => 'L’entrée nécessite un RSVP confirmé.',
                ]);
            }

            $existing = CheckIn::query()
                ->where('guest_id', $guest->id)
                ->whereNull('revoked_at')
                ->first();
            if ($existing) {
                return [$existing->load(['guest', 'operator']), true];
            }

            $checkIn = CheckIn::query()->create([
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'guest_id' => $guest->id,
                'checked_in_by_user_id' => $request->user()->id,
                'party_size' => 1 + max(0, (int) $guest->companions),
                'method' => $data['method'],
                'checkpoint' => $data['checkpoint'] ?? 'main_entrance',
                'checked_in_at' => now(),
                'active_marker' => true,
                'notes' => $data['notes'] ?? null,
            ])->load(['guest', 'operator']);

            WeddingNotificationModel::query()->firstOrCreate(
                ['source_key' => "check-in:{$checkIn->id}"],
                [
                    'wedding_id' => $event->legacy_wedding_id,
                    'organization_id' => $organization->id,
                    'event_id' => $event->id,
                    'title' => 'Arrivée enregistrée',
                    'message' => trim("{$guest->first_name} {$guest->last_name}")
                        ." et son groupe ({$checkIn->party_size}) viennent d’entrer.",
                    'type' => 'info',
                    'target_role' => 'manager',
                    'scope' => 'activity',
                    'audience' => 'team',
                    'delivery_status' => 'delivered',
                    'sent_at' => now(),
                    'created_by_user_id' => $request->user()->id,
                    'is_read' => false,
                ],
            );

            return [$checkIn, false];
        });

        return response()->json(
            [
                'data' => $this->checkInData($checkIn),
                'meta' => ['already_present' => $alreadyPresent],
            ],
            $alreadyPresent ? Response::HTTP_OK : Response::HTTP_CREATED,
        );
    }

    public function destroy(
        Request $request,
        Organization $organization,
        Event $event,
        CheckIn $checkIn,
    ): Response {
        $this->authorizeAccess($event, 'checkins.manage');
        abort_unless(
            $checkIn->organization_id === $organization->id
            && $checkIn->event_id === $event->id,
            404,
        );

        if (! $checkIn->revoked_at) {
            $checkIn->update([
                'revoked_at' => now(),
                'revoked_by_user_id' => $request->user()->id,
                'active_marker' => null,
            ]);
        }

        return response()->noContent();
    }

    private function authorizeAccess(
        Event $event,
        string $permission,
        bool $allowScanner = false,
    ): void {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless(
            $context->allows($permission)
            || ($allowScanner && $context->allows('checkins.scan')),
            403,
        );
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'qr_access')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module QR et contrôle d’accès n’est pas activé pour cet événement.',
        );
    }

    /**
     * @param  Collection<int, GuestModel>  $guests
     * @return array<string, int>
     */
    private function summary($guests): array
    {
        $confirmed = $guests->where('status', 'confirmed');
        $checked = $guests->filter(fn (GuestModel $guest) => $guest->checkIns->isNotEmpty());
        $partySize = fn (GuestModel $guest) => 1 + max(0, (int) $guest->companions);

        return [
            'invited_groups' => $guests->count(),
            'confirmed_groups' => $confirmed->count(),
            'confirmed_people' => $confirmed->sum($partySize),
            'checked_in_groups' => $checked->count(),
            'checked_in_people' => $checked->sum($partySize),
            'remaining_people' => max(0, $confirmed->sum($partySize) - $checked->sum($partySize)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function guestData(GuestModel $guest): array
    {
        $active = $guest->checkIns->first();

        return [
            'id' => $guest->id,
            'first_name' => $guest->first_name,
            'last_name' => $guest->last_name,
            'status' => $guest->status,
            'companions' => (int) $guest->companions,
            'table_id' => $guest->table_id,
            'checked_in' => (bool) $active,
            'check_in' => $active ? $this->checkInData($active) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function checkInData(CheckIn $checkIn): array
    {
        return [
            'id' => $checkIn->id,
            'guest_id' => $checkIn->guest_id,
            'guest_name' => $checkIn->guest
                ? trim("{$checkIn->guest->first_name} {$checkIn->guest->last_name}")
                : null,
            'party_size' => $checkIn->party_size,
            'method' => $checkIn->method,
            'checkpoint' => $checkIn->checkpoint,
            'checked_in_at' => $checkIn->checked_in_at?->toIso8601String(),
            'operator_name' => $checkIn->operator?->name,
        ];
    }

    private function extractToken(string $value): string
    {
        $value = trim($value);
        $query = parse_url($value, PHP_URL_QUERY);
        if (is_string($query)) {
            parse_str($query, $parameters);

            return trim((string) ($parameters['invite'] ?? $value));
        }

        return $value;
    }
}
