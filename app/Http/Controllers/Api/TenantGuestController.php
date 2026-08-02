<?php

namespace App\Http\Controllers\Api;

use App\Application\Seating\SeatingService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\GuestResource;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TenantGuestController extends Controller
{
    public function index(
        Request $request,
        Organization $organization,
        Event $event,
    ): AnonymousResourceCollection {
        $this->authorizeGuests($event, 'guests.view');
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['invited', 'confirmed', 'declined', 'absent'])],
            'role' => ['nullable', 'string', 'max:40'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $guests = GuestModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->when($filters['status'] ?? null, fn ($query, $status) => $query
                ->where('status', $status))
            ->when($filters['role'] ?? null, fn ($query, $role) => $query
                ->where('role', $role))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
                $query->where(fn ($searchQuery) => $searchQuery
                    ->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term));
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($filters['per_page'] ?? 100);

        return GuestResource::collection($guests);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
        SeatingService $seating,
    ): GuestResource {
        $this->authorizeGuests($event, 'guests.update');
        $data = $this->validatedGuest($request, $event, false);

        $guest = DB::transaction(function () use ($data, $organization, $event, $seating) {
            $guest = new GuestModel([
                ...$data,
                'id' => (string) str()->uuid(),
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'wedding_id' => $event->legacy_wedding_id,
                'qr_code' => (string) str()->uuid(),
                'invitation_link' => (string) str()->uuid(),
            ]);
            if ($guest->table_id) {
                $table = WeddingTableModel::query()
                    ->where('organization_id', $organization->id)
                    ->where('event_id', $event->id)
                    ->findOrFail($guest->table_id);
                $seating->ensureCapacity($event, $guest, $table);
            }
            $guest->save();

            return $guest;
        });

        $this->notifyConfirmation($guest, $event);

        return new GuestResource($guest);
    }

    public function show(
        Organization $organization,
        Event $event,
        GuestModel $guest,
    ): GuestResource {
        $this->authorizeGuests($event, 'guests.view');
        $this->assertGuestScope($guest, $organization, $event);

        return new GuestResource($guest);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        GuestModel $guest,
        SeatingService $seating,
    ): GuestResource {
        $this->authorizeGuests($event, 'guests.update');
        $this->assertGuestScope($guest, $organization, $event);
        $wasConfirmed = $guest->status === 'confirmed';

        $data = $this->validatedGuest($request, $event, true);
        $tableId = array_key_exists('table_id', $data) ? $data['table_id'] : $guest->table_id;
        if ($tableId) {
            $table = WeddingTableModel::query()
                ->where('organization_id', $organization->id)
                ->where('event_id', $event->id)
                ->findOrFail($tableId);
            $seating->ensureCapacity(
                $event,
                $guest,
                $table,
                array_key_exists('companions', $data) ? (int) $data['companions'] : null,
            );
        }
        $guest->fill($data)->save();

        if (! $wasConfirmed) {
            $this->notifyConfirmation($guest, $event);
        }

        return new GuestResource($guest->fresh());
    }

    public function destroy(
        Organization $organization,
        Event $event,
        GuestModel $guest,
    ): Response {
        $this->authorizeGuests($event, 'guests.update');
        $this->assertGuestScope($guest, $organization, $event);
        $guest->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedGuest(Request $request, Event $event, bool $partial): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'first_name' => [$presence, 'string', 'max:100'],
            'last_name' => [$presence, 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'status' => ['sometimes', Rule::in(['invited', 'confirmed', 'declined', 'absent'])],
            'role' => ['sometimes', Rule::in([
                'guest',
                'bride',
                'groom',
                'best_man',
                'maid_of_honor',
                'family',
                'vip',
            ])],
            'companions' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'dietary_restrictions' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'drink_preference' => ['sometimes', 'nullable', 'string', 'max:100'],
            'menu_preferences' => ['sometimes', 'nullable', 'array'],
            'menu_preferences.*' => [
                'uuid',
                Rule::exists('menu_items', 'id')->where('event_id', $event->id),
            ],
            'rsvp_message' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'table_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('wedding_tables', 'id')->where('event_id', $event->id),
            ],
        ]);
    }

    private function authorizeGuests(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'guests')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Invités n’est pas activé pour cet événement.',
        );
    }

    private function assertGuestScope(
        GuestModel $guest,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $guest->organization_id === $organization->id
            && $guest->event_id === $event->id,
            404,
        );
    }

    private function notifyConfirmation(GuestModel $guest, Event $event): void
    {
        if ($guest->status !== 'confirmed') {
            return;
        }

        WeddingNotificationModel::query()->firstOrCreate(
            ['source_key' => "guest-confirmed:{$guest->id}"],
            [
                'id' => (string) str()->uuid(),
                'wedding_id' => $event->legacy_wedding_id,
                'organization_id' => $event->organization_id,
                'event_id' => $event->id,
                'title' => 'RSVP confirmé',
                'message' => trim("{$guest->first_name} {$guest->last_name}")
                    .' a confirmé sa présence.',
                'type' => 'info',
                'target_role' => 'manager',
                'is_read' => false,
            ],
        );
    }
}
