<?php

namespace App\Http\Middleware;

use App\Application\Tenancy\TenantAccessService;
use App\Models\Event;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'app_url' => config('app.url'),
            'auth' => [
                'user' => $request->user()?->only([
                    'id', 'name', 'email', 'role', 'wedding_id', 'is_active',
                ]),
                'platform_admin' => $request->user()?->isSuperAdmin() ?? false,
                'superadmin' => $request->user()?->isSuperAdmin() ?? false,
            ],
            'workspace' => fn () => $this->activeWorkspace($request),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function activeWorkspace(Request $request): ?array
    {
        $user = $request->user();
        $organizationId = $request->session()->get('active_organization_id');
        $eventId = $request->session()->get('active_event_id');

        if (! $user || ! $organizationId || ! $eventId) {
            return null;
        }

        $event = Event::query()
            ->whereKey($eventId)
            ->where('organization_id', $organizationId)
            ->where(fn ($query) => $query
                ->whereHas('organization', fn ($organization) => $organization
                    ->where('owner_user_id', $user->id))
                ->orWhereHas('members.organizationMember', fn ($members) => $members
                    ->where('user_id', $user->id)
                    ->where('status', 'active')))
            ->with([
                'organization:id,owner_user_id,name,slug,status,currency',
                'type:id,name,slug',
                'enabledModules:id,slug',
            ])
            ->first();

        if (! $event) {
            $request->session()->forget(['active_organization_id', 'active_event_id']);

            return null;
        }

        $tenantContext = app(TenantAccessService::class)->resolve(
            $user,
            $event->organization,
            $event,
        );

        return [
            'organization' => [
                'id' => $event->organization->id,
                'name' => $event->organization->name,
                'slug' => $event->organization->slug,
                'currency' => $event->organization->currency,
            ],
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'type' => $event->type?->name,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'venue_name' => $event->venue_name,
                'legacy_wedding_id' => $event->legacy_wedding_id,
            ],
            'permissions' => $tenantContext->permissions,
            'modules' => $event->enabledModules->pluck('slug')->values(),
        ];
    }
}
