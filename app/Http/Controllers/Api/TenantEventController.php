<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class TenantEventController extends Controller
{
    public function index(Organization $organization): AnonymousResourceCollection
    {
        Gate::authorize('view', $organization);
        $context = app(TenantContext::class);

        $events = Event::query()
            ->with('type')
            ->where('organization_id', $organization->id)
            ->when(! $context->isOwner, fn ($query) => $query->whereHas(
                'members.organizationMember',
                fn ($members) => $members
                    ->where('user_id', $context->userId)
                    ->where('organization_id', $context->organizationId),
            ))
            ->orderByDesc('starts_at')
            ->paginate(25);

        return EventResource::collection($events);
    }

    public function show(Organization $organization, Event $event): EventResource
    {
        Gate::authorize('view', $event);

        return new EventResource(
            $event->load(['type', 'enabledModules']),
        );
    }
}
