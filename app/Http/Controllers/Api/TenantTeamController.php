<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TeamInvitationService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMember;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantTeamController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTeam($event, 'team.view');

        $members = EventMember::query()
            ->where('event_id', $event->id)
            ->with(['organizationMember.user', 'roles.permissions'])
            ->orderBy('created_at')
            ->get();
        $invitations = OrganizationInvitation::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->where('status', 'pending')
            ->with(['inviter:id,name', 'event:id,name'])
            ->latest()
            ->get();
        $roles = Role::query()
            ->where('organization_id', $organization->id)
            ->where('scope', 'event')
            ->with('permissions')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => [
                'members' => $members->map(fn (EventMember $member) => $this->memberData(
                    $member,
                    $organization,
                )),
                'invitations' => $invitations->map(fn (OrganizationInvitation $invitation) => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'phone' => $invitation->phone,
                    'role_slug' => $invitation->proposed_roles[0] ?? null,
                    'status' => $invitation->status,
                    'expires_at' => $invitation->expires_at?->toIso8601String(),
                    'invited_by' => $invitation->inviter?->name,
                ]),
                'roles' => $roles->map(fn (Role $role) => [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('key')->values(),
                ]),
            ],
        ]);
    }

    public function invite(
        Request $request,
        Organization $organization,
        Event $event,
        TeamInvitationService $invitations,
    ): JsonResponse {
        $this->authorizeTeam($event, 'team.manage');
        $data = $request->validate([
            'email' => ['nullable', 'required_without:phone', 'email:rfc', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:40'],
            'role_slug' => ['required', 'string', 'max:100'],
        ]);
        $role = Role::query()
            ->where('organization_id', $organization->id)
            ->where('scope', 'event')
            ->where('slug', $data['role_slug'])
            ->firstOrFail();

        $duplicate = OrganizationInvitation::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->where(function ($query) use ($data) {
                if (! empty($data['email'])) {
                    $query->where('email', mb_strtolower(trim($data['email'])));
                }
                if (! empty($data['phone'])) {
                    $method = empty($data['email']) ? 'where' : 'orWhere';
                    $query->{$method}('phone', trim($data['phone']));
                }
            })
            ->exists();
        if ($duplicate) {
            throw ValidationException::withMessages([
                'email' => 'Une invitation active existe déjà pour ce contact.',
            ]);
        }

        $result = $invitations->create(
            $organization->id,
            $event->id,
            $request->user(),
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $role,
        );
        $url = route('team-invitations.show', ['token' => $result['token']]);

        return response()->json([
            'data' => [
                'id' => $result['invitation']->id,
                'email' => $result['invitation']->email,
                'phone' => $result['invitation']->phone,
                'role_slug' => $role->slug,
                'status' => 'pending',
                'expires_at' => $result['invitation']->expires_at->toIso8601String(),
                'invitation_url' => $url,
            ],
        ], Response::HTTP_CREATED);
    }

    public function updateMember(
        Request $request,
        Organization $organization,
        Event $event,
        OrganizationMember $organizationMember,
    ): JsonResponse {
        $this->authorizeTeam($event, 'team.manage');
        abort_unless($organizationMember->organization_id === $organization->id, 404);
        abort_if(
            (string) $organization->owner_user_id === (string) $organizationMember->user_id,
            422,
            'Les droits du propriétaire ne peuvent pas être modifiés.',
        );

        $data = $request->validate([
            'role_slug' => ['sometimes', 'required', 'string', 'max:100'],
            'status' => ['sometimes', 'required', Rule::in(['active', 'suspended'])],
        ]);
        abort_if(
            ($data['status'] ?? null) === 'suspended'
            && (string) $organizationMember->user_id === (string) $request->user()->id,
            422,
            'Vous ne pouvez pas suspendre votre propre accès.',
        );

        $eventMember = EventMember::query()
            ->where('event_id', $event->id)
            ->where('organization_member_id', $organizationMember->id)
            ->with(['organizationMember.user', 'roles.permissions'])
            ->firstOrFail();

        DB::transaction(function () use ($data, $eventMember, $organization) {
            if (isset($data['role_slug'])) {
                $role = Role::query()
                    ->where('organization_id', $organization->id)
                    ->where('scope', 'event')
                    ->where('slug', $data['role_slug'])
                    ->firstOrFail();
                $eventMember->roles()->sync([$role->id]);
            }
            if (isset($data['status'])) {
                $eventMember->update(['status' => $data['status']]);
            }
        });

        return response()->json([
            'data' => $this->memberData(
                $eventMember->fresh(['organizationMember.user', 'roles.permissions']),
                $organization,
            ),
        ]);
    }

    public function cancelInvitation(
        Organization $organization,
        Event $event,
        OrganizationInvitation $invitation,
    ): Response {
        $this->authorizeTeam($event, 'team.manage');
        abort_unless(
            $invitation->organization_id === $organization->id
            && $invitation->event_id === $event->id,
            404,
        );

        if ($invitation->status === 'pending') {
            $invitation->update(['status' => 'cancelled']);
        }

        return response()->noContent();
    }

    private function authorizeTeam(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function memberData(EventMember $member, Organization $organization): array
    {
        $organizationMember = $member->organizationMember;
        $user = $organizationMember->user;

        return [
            'id' => $organizationMember->id,
            'event_member_id' => $member->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $member->status,
            'is_owner' => (string) $organization->owner_user_id === (string) $user->id,
            'roles' => $member->roles->map(fn (Role $role) => [
                'slug' => $role->slug,
                'name' => $role->name,
            ])->values(),
            'permissions' => $member->roles
                ->flatMap(fn (Role $role) => $role->permissions->pluck('key'))
                ->unique()
                ->values(),
            'joined_at' => $organizationMember->joined_at?->toIso8601String(),
        ];
    }
}
