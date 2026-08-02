<?php

namespace App\Application\Tenancy;

use App\Models\Event;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;

class TenantAccessService
{
    public function resolve(User $user, Organization $organization, ?Event $event = null): TenantContext
    {
        abort_unless($organization->status === 'active', 403, 'Cette organisation est inactive.');

        if ($event) {
            abort_unless($event->organization_id === $organization->id, 404);
        }

        $membership = OrganizationMember::query()
            ->with([
                'roles.permissions',
                'eventMemberships' => fn ($query) => $event
                    ? $query->where('event_id', $event->id)->with('roles.permissions')
                    : $query->whereRaw('1 = 0'),
            ])
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        $isOwner = (string) $organization->owner_user_id === (string) $user->id;
        abort_unless($membership || $isOwner, 403, 'Vous n’appartenez pas à cette organisation.');

        if ($event && ! $isOwner) {
            $eventMembership = $membership?->eventMemberships->first();
            abort_unless(
                $eventMembership && $eventMembership->status === 'active',
                403,
                'Vous n’êtes pas affecté à cet événement.',
            );
        }

        $permissions = collect();
        if ($membership) {
            $permissions->push('organization.view');
            $permissions->push(
                ...$membership->roles
                    ->flatMap(fn ($role) => $role->permissions->pluck('key'))
                    ->all(),
            );

            if ($event) {
                $permissions->push(
                    ...$membership->eventMemberships
                        ->flatMap(fn ($eventMembership) => $eventMembership->roles)
                        ->flatMap(fn ($role) => $role->permissions->pluck('key'))
                        ->all(),
                );
            }
        }

        return new TenantContext(
            organizationId: $organization->id,
            userId: $user->id,
            eventId: $event?->id,
            permissions: $isOwner ? ['*'] : $permissions->unique()->values()->all(),
            isOwner: $isOwner,
        );
    }
}
