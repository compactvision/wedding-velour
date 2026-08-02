<?php

namespace App\Http\Controllers\Api;

use App\Application\Communications\CommunicationService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\CommunicationResource;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantCommunicationController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
        CommunicationService $communications,
    ): JsonResponse {
        $this->authorizeCommunications($event, 'notifications.view');
        $query = WeddingNotificationModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id);
        $campaigns = (clone $query)
            ->where('scope', 'campaign')
            ->with('creator:id,name')
            ->latest()
            ->get();
        $activity = (clone $query)
            ->where('scope', 'activity')
            ->with('creator:id,name')
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'data' => [
                'campaigns' => CommunicationResource::collection($campaigns),
                'activity' => CommunicationResource::collection($activity),
                'summary' => [
                    'drafts' => $campaigns->where('delivery_status', 'draft')->count(),
                    'scheduled' => $campaigns->where('delivery_status', 'scheduled')->count(),
                    'sent' => $campaigns->where('delivery_status', 'sent')->count(),
                    'unread_activity' => $activity->where('is_read', false)->count(),
                    'reachable_guests' => $communications->recipientCount(
                        $event,
                        'all_guests',
                    ),
                ],
            ],
        ]);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeCommunications($event, 'notifications.update');
        $data = $this->validatedCommunication($request);
        $communication = WeddingNotificationModel::query()->create([
            ...$data,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => $event->legacy_wedding_id,
            'scope' => 'campaign',
            'target_role' => $data['audience'],
            'channel' => 'in_app',
            'delivery_status' => empty($data['scheduled_at'])
                ? 'draft'
                : 'scheduled',
            'created_by_user_id' => $request->user()->id,
            'is_read' => true,
        ]);

        return (new CommunicationResource(
            $communication->load('creator:id,name'),
        ))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        WeddingNotificationModel $communication,
    ): CommunicationResource {
        $this->authorizeCommunications($event, 'notifications.update');
        $this->assertCommunicationScope($communication, $organization, $event);
        $this->assertEditable($communication);
        $data = $this->validatedCommunication($request, true);
        if (array_key_exists('audience', $data)) {
            $data['target_role'] = $data['audience'];
        }
        if (array_key_exists('scheduled_at', $data)) {
            $data['delivery_status'] = $data['scheduled_at']
                ? 'scheduled'
                : 'draft';
        }
        $communication->fill($data)->save();

        return new CommunicationResource(
            $communication->fresh()->load('creator:id,name'),
        );
    }

    public function destroy(
        Organization $organization,
        Event $event,
        WeddingNotificationModel $communication,
    ): Response {
        $this->authorizeCommunications($event, 'notifications.update');
        $this->assertCommunicationScope($communication, $organization, $event);
        $this->assertEditable($communication);
        $communication->delete();

        return response()->noContent();
    }

    public function publish(
        Organization $organization,
        Event $event,
        WeddingNotificationModel $communication,
        CommunicationService $communications,
    ): CommunicationResource {
        $this->authorizeCommunications($event, 'notifications.update');
        $this->assertCommunicationScope($communication, $organization, $event);

        return new CommunicationResource(
            $communications->publish($communication),
        );
    }

    public function markRead(
        Organization $organization,
        Event $event,
        WeddingNotificationModel $communication,
    ): CommunicationResource {
        $this->authorizeCommunications($event, 'notifications.view');
        $this->assertCommunicationScope($communication, $organization, $event);
        $communication->update(['is_read' => true]);

        return new CommunicationResource(
            $communication->fresh()->load('creator:id,name'),
        );
    }

    public function markAllRead(
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeCommunications($event, 'notifications.view');
        WeddingNotificationModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->where('scope', 'activity')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Activité marquée comme lue.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedCommunication(
        Request $request,
        bool $partial = false,
    ): array {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$presence, 'string', 'max:180'],
            'message' => [$presence, 'string', 'max:5000'],
            'type' => [
                $presence,
                Rule::in([
                    'announcement',
                    'reminder',
                    'schedule',
                    'rsvp',
                    'alert',
                    'info',
                ]),
            ],
            'audience' => [
                $presence,
                Rule::in([
                    'all_guests',
                    'confirmed_guests',
                    'pending_rsvp',
                    'team',
                ]),
            ],
            'scheduled_at' => ['sometimes', 'nullable', 'date', 'after:now'],
            'action_url' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);
    }

    private function authorizeCommunications(
        Event $event,
        string $permission,
    ): void {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'notifications')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Notifications n’est pas activé pour cet événement.',
        );
    }

    private function assertCommunicationScope(
        WeddingNotificationModel $communication,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $communication->organization_id === $organization->id
            && $communication->event_id === $event->id,
            404,
        );
    }

    private function assertEditable(
        WeddingNotificationModel $communication,
    ): void {
        if (
            $communication->scope !== 'campaign'
            || $communication->delivery_status === 'sent'
        ) {
            throw ValidationException::withMessages([
                'communication' => 'Une communication déjà publiée ne peut plus être modifiée.',
            ]);
        }
    }
}
