<?php

namespace App\Application\Tenancy;

use App\Models\EventMember;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TeamInvitationService
{
    /**
     * @return array{invitation: OrganizationInvitation, token: string}
     */
    public function create(
        string $organizationId,
        string $eventId,
        User $inviter,
        ?string $email,
        ?string $phone,
        Role $role,
    ): array {
        $token = Str::random(64);
        $invitation = OrganizationInvitation::query()->create([
            'organization_id' => $organizationId,
            'event_id' => $eventId,
            'invited_by_user_id' => $inviter->id,
            'email' => $email ? Str::lower(trim($email)) : null,
            'phone' => $phone ? trim($phone) : null,
            'token_hash' => hash('sha256', $token),
            'proposed_roles' => [$role->slug],
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
            'last_sent_at' => now(),
        ]);

        return ['invitation' => $invitation, 'token' => $token];
    }

    public function accept(OrganizationInvitation $invitation, User $user): EventMember
    {
        return DB::transaction(function () use ($invitation, $user) {
            $invitation = OrganizationInvitation::query()
                ->lockForUpdate()
                ->findOrFail($invitation->id);

            if ($invitation->status === 'accepted') {
                return EventMember::query()
                    ->where('event_id', $invitation->event_id)
                    ->whereHas(
                        'organizationMember',
                        fn ($query) => $query->where('user_id', $user->id),
                    )
                    ->firstOrFail();
            }

            if ($invitation->status !== 'pending' || $invitation->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'invitation' => 'Cette invitation a expiré ou n’est plus disponible.',
                ]);
            }

            $emailMatches = $invitation->email
                && Str::lower($user->email) === Str::lower($invitation->email);
            $phoneMatches = $invitation->phone
                && $user->phone
                && $this->normalizePhone($user->phone) === $this->normalizePhone($invitation->phone);
            if (! $emailMatches && ! $phoneMatches) {
                throw ValidationException::withMessages([
                    'invitation' => 'Connectez-vous avec l’adresse e-mail ou le téléphone invité.',
                ]);
            }

            $role = Role::query()
                ->where('organization_id', $invitation->organization_id)
                ->where('scope', 'event')
                ->whereIn('slug', $invitation->proposed_roles ?? [])
                ->firstOrFail();
            $member = OrganizationMember::query()->firstOrCreate(
                [
                    'organization_id' => $invitation->organization_id,
                    'user_id' => $user->id,
                ],
                [
                    'status' => 'active',
                    'joined_at' => now(),
                ],
            );
            if ($member->status !== 'active') {
                $member->update(['status' => 'active', 'joined_at' => now()]);
            }

            $eventMember = EventMember::query()->firstOrCreate(
                [
                    'event_id' => $invitation->event_id,
                    'organization_member_id' => $member->id,
                ],
                [
                    'status' => 'active',
                    'assigned_at' => now(),
                ],
            );
            $eventMember->update(['status' => 'active']);
            $eventMember->roles()->sync([$role->id]);
            $invitation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
                'accepted_by_user_id' => $user->id,
            ]);

            return $eventMember->fresh(['roles', 'organizationMember.user']);
        });
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?: '';
    }
}
