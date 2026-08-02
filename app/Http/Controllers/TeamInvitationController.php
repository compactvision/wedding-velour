<?php

namespace App\Http\Controllers;

use App\Application\Tenancy\TeamInvitationService;
use App\Models\OrganizationInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamInvitationController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $invitation = $this->findInvitation($token);
        $invitation->load(['organization:id,name', 'event:id,name', 'inviter:id,name']);

        return Inertia::render('TeamInvitation', [
            'invitation' => [
                'organization' => $invitation->organization->name,
                'event' => $invitation->event?->name,
                'invited_by' => $invitation->inviter?->name,
                'recipient' => $invitation->email ?: $invitation->phone,
                'role' => $invitation->proposed_roles[0] ?? null,
                'status' => $invitation->status,
                'expires_at' => $invitation->expires_at?->toIso8601String(),
            ],
            'token' => $token,
        ]);
    }

    public function accept(
        Request $request,
        string $token,
        TeamInvitationService $invitations,
    ): RedirectResponse {
        $invitation = $this->findInvitation($token);
        $eventMember = $invitations->accept($invitation, $request->user());
        $request->session()->put([
            'active_organization_id' => $invitation->organization_id,
            'active_event_id' => $eventMember->event_id,
        ]);

        return redirect()->route('workspace')->with(
            'success',
            'Invitation acceptée. Bienvenue dans l’équipe.',
        );
    }

    private function findInvitation(string $token): OrganizationInvitation
    {
        return OrganizationInvitation::query()
            ->where('token_hash', hash('sha256', $token))
            ->firstOrFail();
    }
}
