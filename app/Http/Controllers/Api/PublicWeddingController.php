<?php

namespace App\Http\Controllers\Api;

use App\Application\Invitations\InvitationSettingsService;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PublicWeddingController extends Controller
{
    public function invitation(
        Request $request,
        string $token,
        InvitationSettingsService $invitations,
    ): JsonResponse {
        $guest = GuestModel::query()
            ->where('invitation_link', $token)
            ->with(['event.settings'])
            ->firstOrFail();

        if ($this->requiresIdentityVerification($guest)
            && ! $this->hasInvitationAccess($request, $guest)) {
            return response()->json([
                'requires_verification' => true,
                'verification_channel' => $this->verificationChannel($guest),
                'masked_destination' => $this->maskedDestination($guest),
            ]);
        }

        $event = $guest->event?->loadMissing('type');
        $menuItems = MenuItemModel::query()
            ->when(
                $guest->event_id,
                fn ($query) => $query->where('event_id', $guest->event_id),
                fn ($query) => $query->where('wedding_id', $guest->wedding_id),
            )
            ->where('is_available', true)
            ->orderBy('sort_order')
            ->get();
        $selectedMenuItems = collect($guest->menu_preferences ?? [])
            ->map(fn ($id) => $menuItems->firstWhere('id', $id))
            ->filter()
            ->values();
        $guest->setAttribute('selected_menu_items', $selectedMenuItems);
        $guest->unsetRelation('event');
        $configuration = $event
            ? $invitations->forEvent($event)
            : [];
        $invitationSubject = $guest->wedding_id
            ? WeddingModel::findOrFail($guest->wedding_id)
            : $this->eventAsInvitation($event, $configuration);
        $announcementAudiences = ['all_guests'];
        if ($guest->status === 'confirmed') {
            $announcementAudiences[] = 'confirmed_guests';
        } elseif ($guest->status === 'invited') {
            $announcementAudiences[] = 'pending_rsvp';
        }

        if ($invitationSubject instanceof WeddingModel) {
            $configuration = [
                ...($invitationSubject->invitation_custom ?? []),
                ...$configuration,
            ];
            $invitationSubject->setAttribute('invitation_custom', $configuration);
            if (($configuration['show_event_details'] ?? true) === false) {
                $invitationSubject->setAttribute('date', null);
                $invitationSubject->setAttribute('venue', null);
                $invitationSubject->setAttribute('venue_address', null);
            }
        }

        if ($invitationSubject instanceof WeddingModel) {
            $invitationSubject->setAttribute('event_type_slug', $event?->type?->slug ?? 'wedding');
        } else {
            $invitationSubject['event_type_slug'] = $event?->type?->slug;
        }

        return response()->json([
            'guest' => $guest,
            'wedding' => $invitationSubject,
            'timeline' => TimelineEventModel::query()
                ->when(
                    $guest->event_id,
                    fn ($query) => $query->where('event_id', $guest->event_id),
                    fn ($query) => $query->where('wedding_id', $guest->wedding_id),
                )
                ->where('visibility', 'public')
                ->orderByRaw('starts_at is null')
                ->orderBy('starts_at')
                ->orderBy('time')
                ->get(),
            'table' => $guest->table_id ? WeddingTableModel::find($guest->table_id) : null,
            'co_guests' => $guest->table_id
                ? GuestModel::where('event_id', $guest->event_id)
                    ->where('table_id', $guest->table_id)
                    ->whereKeyNot($guest->id)
                    ->get()
                : [],
            'menu_items' => $menuItems,
            'orders' => OrderModel::where('guest_id', $guest->id)->latest()->get(),
            'announcements' => WeddingNotificationModel::query()
                ->when(
                    $guest->event_id,
                    fn ($query) => $query->where('event_id', $guest->event_id),
                    fn ($query) => $query->where('wedding_id', $guest->wedding_id),
                )
                ->where('scope', 'campaign')
                ->where('channel', 'in_app')
                ->where('delivery_status', 'sent')
                ->whereIn('audience', $announcementAudiences)
                ->latest('sent_at')
                ->get([
                    'id',
                    'title',
                    'message',
                    'type',
                    'action_url',
                    'sent_at',
                ]),
        ]);
    }

    public function verifyInvitation(Request $request, string $token): JsonResponse
    {
        $guest = GuestModel::query()
            ->where('invitation_link', $token)
            ->firstOrFail();
        $data = $request->validate([
            'identity' => ['required', 'string', 'max:190'],
        ]);

        abort_unless($this->identityMatches($guest, $data['identity']), 422,
            'Ces informations ne correspondent pas à cette invitation.');

        $accessToken = Crypt::encryptString(json_encode([
            'guest_id' => $guest->id,
            'invitation' => hash('sha256', (string) $guest->invitation_link),
            'expires_at' => now()->addMonths(12)->timestamp,
        ], JSON_THROW_ON_ERROR));

        return response()->json([
            'access_token' => $accessToken,
            'message' => 'Identité confirmée.',
        ]);
    }

    public function respond(
        Request $request,
        string $token,
        InvitationSettingsService $invitations,
    ): JsonResponse {
        $guest = GuestModel::query()
            ->where('invitation_link', $token)
            ->with('event')
            ->firstOrFail();
        $this->authorizeInvitationRequest($request, $guest);
        $data = $request->validate([
            'status' => ['required', 'in:attending,confirmed,declined'],
            'rsvp_message' => ['nullable', 'string', 'max:2000'],
            'menu_preferences' => ['nullable', 'array', 'max:5'],
            'menu_preferences.*' => ['uuid'],
        ]);

        $deadline = $guest->event
            ? $invitations->forEvent($guest->event)['rsvp_deadline'] ?? null
            : null;
        if ($deadline) {
            abort_if(
                now($guest->event->timezone)->startOfDay()->isAfter($deadline),
                422,
                'La date limite de réponse est dépassée.',
            );
        }

        if ($data['status'] === 'attending') {
            $data['status'] = 'confirmed';
        }

        if (! empty($data['menu_preferences'])) {
            $validMenuItems = MenuItemModel::query()
                ->where('event_id', $guest->event_id)
                ->whereIn('id', $data['menu_preferences'])
                ->count();
            abort_unless($validMenuItems === count($data['menu_preferences']), 422);
        }

        $guest->update($data);

        return response()->json($guest->fresh());
    }

    public function invitationOrder(Request $request, string $token): JsonResponse
    {
        $guest = GuestModel::where('invitation_link', $token)->firstOrFail();
        $this->authorizeInvitationRequest($request, $guest);
        $data = $request->validate([
            'type' => ['required', 'in:drink,food,dessert,special_request'],
            'description' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'offline_uuid' => ['nullable', 'uuid'],
            'menu_item_id' => [
                'nullable',
                'uuid',
                Rule::exists('menu_items', 'id')->where('event_id', $guest->event_id),
            ],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $offlineUuid = $data['offline_uuid'] ?? null;
        $order = $offlineUuid
            ? OrderModel::firstOrCreate(
                ['offline_uuid' => $offlineUuid],
                $this->invitationOrderAttributes($guest, $data)
            )
            : OrderModel::create($this->invitationOrderAttributes($guest, $data));

        $this->notifyNewOrder($order);

        return response()->json($order, $order->wasRecentlyCreated ? 201 : 200);
    }

    public function tableMenu(string $tableId): JsonResponse
    {
        $table = WeddingTableModel::findOrFail($tableId);
        $event = $table->event_id ? Event::query()->find($table->event_id) : null;

        return response()->json([
            'table' => $table,
            'wedding' => $table->wedding_id
                ? WeddingModel::findOrFail($table->wedding_id)
                : [
                    'id' => $event?->id,
                    'title' => $event?->name,
                    'date' => $event?->starts_at?->toDateString(),
                    'venue' => $event?->venue_name,
                ],
            'menu_items' => MenuItemModel::query()
                ->when(
                    $table->event_id,
                    fn ($query) => $query->where('event_id', $table->event_id),
                    fn ($query) => $query->where('wedding_id', $table->wedding_id),
                )
                ->where('is_available', true)
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function tableOrder(Request $request, string $tableId): JsonResponse
    {
        $table = WeddingTableModel::findOrFail($tableId);
        $data = $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:drink,food,dessert,special_request'],
            'description' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'offline_uuid' => ['nullable', 'uuid'],
            'menu_item_id' => [
                'nullable',
                'uuid',
                Rule::exists('menu_items', 'id')->where('event_id', $table->event_id),
            ],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $offlineUuid = $data['offline_uuid'] ?? null;
        $attributes = [
            'id' => (string) Str::uuid(),
            'wedding_id' => $table->wedding_id,
            'organization_id' => $table->organization_id,
            'event_id' => $table->event_id,
            'table_id' => $table->id,
            'table_name' => $table->name,
            ...$data,
            'quantity' => $data['quantity'] ?? 1,
            'status' => 'pending',
            'priority' => 'normal',
        ];
        $order = $offlineUuid
            ? OrderModel::firstOrCreate(['offline_uuid' => $offlineUuid], $attributes)
            : OrderModel::create($attributes);

        $this->notifyNewOrder($order);

        return response()->json($order, $order->wasRecentlyCreated ? 201 : 200);
    }

    private function invitationOrderAttributes(GuestModel $guest, array $data): array
    {
        return [
            'id' => (string) Str::uuid(),
            'wedding_id' => $guest->wedding_id,
            'organization_id' => $guest->organization_id,
            'event_id' => $guest->event_id,
            'table_id' => $guest->table_id,
            'table_name' => $guest->table_id
                ? WeddingTableModel::find($guest->table_id)?->name
                : 'Non assigné',
            'guest_id' => $guest->id,
            'guest_name' => "{$guest->first_name} {$guest->last_name}",
            ...$data,
            'quantity' => $data['quantity'] ?? 1,
            'status' => 'pending',
            'priority' => 'normal',
        ];
    }

    private function authorizeInvitationRequest(Request $request, GuestModel $guest): void
    {
        abort_if(
            $this->requiresIdentityVerification($guest)
                && ! $this->hasInvitationAccess($request, $guest),
            403,
            'Cette invitation doit d’abord être déverrouillée.',
        );
    }

    private function requiresIdentityVerification(GuestModel $guest): bool
    {
        return filled($guest->email) || filled($guest->phone);
    }

    private function hasInvitationAccess(Request $request, GuestModel $guest): bool
    {
        $token = $request->header('X-Invitation-Access');
        if (! is_string($token) || $token === '') {
            return false;
        }

        try {
            $payload = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return false;
        }

        return ($payload['guest_id'] ?? null) === $guest->id
            && ($payload['invitation'] ?? null) === hash('sha256', (string) $guest->invitation_link)
            && (int) ($payload['expires_at'] ?? 0) > now()->timestamp;
    }

    private function identityMatches(GuestModel $guest, string $identity): bool
    {
        $identity = trim($identity);
        $emailMatches = filled($guest->email)
            && hash_equals(mb_strtolower(trim((string) $guest->email)), mb_strtolower($identity));
        $submittedPhone = preg_replace('/\D+/', '', $identity) ?? '';
        $storedPhone = preg_replace('/\D+/', '', (string) $guest->phone) ?? '';
        $phoneMatches = filled($guest->phone)
            && $submittedPhone !== ''
            && hash_equals($storedPhone, $submittedPhone);

        return $emailMatches || $phoneMatches;
    }

    private function verificationChannel(GuestModel $guest): string
    {
        if (filled($guest->email) && filled($guest->phone)) {
            return 'email_or_phone';
        }

        return filled($guest->email) ? 'email' : 'phone';
    }

    private function maskedDestination(GuestModel $guest): string
    {
        if (filled($guest->email)) {
            [$name, $domain] = array_pad(explode('@', (string) $guest->email, 2), 2, '');

            return mb_substr($name, 0, 1).'•••@'.$domain;
        }

        $phone = preg_replace('/\D+/', '', (string) $guest->phone) ?? '';

        return '••••'.mb_substr($phone, -4);
    }

    private function notifyNewOrder(OrderModel $order): void
    {
        WeddingNotificationModel::firstOrCreate(
            ['source_key' => "order:{$order->id}"],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $order->wedding_id,
                'organization_id' => $order->organization_id,
                'event_id' => $order->event_id,
                'title' => 'Nouvelle commande',
                'message' => "{$order->guest_name} · {$order->table_name} · {$order->description}",
                'type' => 'order',
                'target_role' => 'server',
                'is_read' => false,
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function eventAsInvitation(
        ?Event $event,
        array $configuration,
    ): array {
        abort_unless($event, 404);

        return [
            'id' => $event->id,
            'title' => $event->name,
            'date' => ($configuration['show_event_details'] ?? true)
                ? $event->starts_at?->toDateString()
                : null,
            'venue' => ($configuration['show_event_details'] ?? true)
                ? $event->venue_name
                : null,
            'venue_address' => ($configuration['show_event_details'] ?? true)
                ? $event->venue_address
                : null,
            'status' => $event->status,
            'max_guests' => $event->estimated_guests,
            'invitation_custom' => $configuration,
            'event_type_slug' => $event->type?->slug,
        ];
    }
}
