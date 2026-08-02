<?php

namespace App\Policies;

use App\Application\Tenancy\TenantContext;
use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function view(User $user, Organization $organization): bool
    {
        $context = app(TenantContext::class);

        return $context->userId === (string) $user->id
            && $context->organizationId === $organization->id
            && $context->allows('organization.view');
    }

    public function update(User $user, Organization $organization): bool
    {
        $context = app(TenantContext::class);

        return $context->userId === (string) $user->id
            && $context->organizationId === $organization->id
            && $context->allows('organization.update');
    }
}
