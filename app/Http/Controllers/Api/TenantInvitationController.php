<?php

namespace App\Http\Controllers\Api;

use App\Application\Invitations\InvitationSettingsService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantInvitationController extends Controller
{
    public function show(
        Organization $organization,
        Event $event,
        InvitationSettingsService $invitations,
    ): JsonResponse {
        $this->authorizeInvitations($event, 'invitations.view');

        return response()->json([
            'data' => [
                'configuration' => $invitations->forEvent($event),
                'event_type' => $event->type?->name,
                'templates' => $invitations->templatesForEvent($event),
                'rsvp_summary' => $invitations->rsvpSummary($event),
            ],
        ]);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        InvitationSettingsService $invitations,
    ): JsonResponse {
        $this->authorizeInvitations($event, 'invitations.update');
        $configuration = $request->validate([
            'eyebrow' => ['required', 'string', 'max:160'],
            'title' => ['required', 'string', 'max:200'],
            'greeting' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'rsvp_question' => ['required', 'string', 'max:300'],
            'accept_label' => ['required', 'string', 'max:100'],
            'decline_label' => ['required', 'string', 'max:100'],
            'footer' => ['nullable', 'string', 'max:300'],
            'background_image' => ['nullable', 'string', 'max:2000'],
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'rsvp_deadline' => ['nullable', 'date'],
            'show_event_details' => ['required', 'boolean'],
        ]);

        return response()->json([
            'data' => [
                'configuration' => $invitations->save($event, $configuration),
                'event_type' => $event->type?->name,
                'templates' => $invitations->templatesForEvent($event),
                'rsvp_summary' => $invitations->rsvpSummary($event),
            ],
        ]);
    }

    private function authorizeInvitations(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'invitations')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Invitations n’est pas activé pour cet événement.',
        );
    }
}
