<?php

namespace App\Policies;

use App\Application\Tenancy\TenantContext;
use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function view(User $user, Event $event): bool
    {
        $context = app(TenantContext::class);

        return $context->userId === (string) $user->id
            && $context->organizationId === $event->organization_id
            && $context->eventId === $event->id
            && $context->allows('event.view');
    }

    public function update(User $user, Event $event): bool
    {
        $context = app(TenantContext::class);

        return $context->userId === (string) $user->id
            && $context->organizationId === $event->organization_id
            && $context->eventId === $event->id
            && $context->allows('event.update');
    }
}
