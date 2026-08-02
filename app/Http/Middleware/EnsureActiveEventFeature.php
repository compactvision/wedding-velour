<?php

namespace App\Http\Middleware;

use App\Application\Tenancy\TenantAccessService;
use App\Models\Event;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveEventFeature
{
    public function __construct(private readonly TenantAccessService $tenantAccess) {}

    public function handle(
        Request $request,
        Closure $next,
        string $modules,
        ?string $permission = null,
    ): Response|RedirectResponse {
        if ($request->user()?->isAdmin()) {
            return $next($request);
        }

        $organizationId = $request->session()->get('active_organization_id');
        $eventId = $request->session()->get('active_event_id');

        if (! $organizationId || ! $eventId) {
            return redirect()->route('onboarding');
        }

        $event = Event::query()
            ->whereKey($eventId)
            ->where('organization_id', $organizationId)
            ->with(['organization', 'enabledModules:id,slug'])
            ->first();

        if (! $event) {
            $request->session()->forget(['active_organization_id', 'active_event_id']);

            return redirect()->route('onboarding');
        }

        $context = $this->tenantAccess->resolve(
            $request->user(),
            $event->organization,
            $event,
        );
        $allowedModules = explode('|', $modules);
        $moduleIsEnabled = $modules === '*' || $event->enabledModules
            ->pluck('slug')
            ->intersect($allowedModules)
            ->isNotEmpty();

        abort_unless(
            $moduleIsEnabled,
            403,
            'Ce module n’est pas activé pour cet événement.',
        );
        abort_unless(
            ! $permission || $context->allows($permission),
            403,
            'Votre rôle ne permet pas d’accéder à ce module.',
        );

        return $next($request);
    }
}
