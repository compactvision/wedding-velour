<?php

namespace App\Http\Middleware;

use App\Application\Tenancy\TenantAccessService;
use App\Application\Tenancy\TenantContext;
use App\Models\Event;
use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    public function __construct(private readonly TenantAccessService $tenantAccess) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_active && $user->status === 'active', 403);

        $organization = $request->route('organization');
        abort_unless($organization instanceof Organization, 404);

        $event = $request->route('event');
        abort_unless($event === null || $event instanceof Event, 404);

        $context = $this->tenantAccess->resolve($user, $organization, $event);
        $request->attributes->set(TenantContext::class, $context);
        app()->instance(TenantContext::class, $context);

        try {
            return $next($request);
        } finally {
            app()->forgetInstance(TenantContext::class);
        }
    }
}
