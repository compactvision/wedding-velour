<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->guest(route('login'));
        }

        if (! $user->is_active) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => 'Ce compte a été désactivé.',
            ]);
        }

        if (in_array('superadmin', $roles, true) && ! $user->isSuperAdmin()) {
            abort(403, 'Cet espace est réservé au superadministrateur.');
        }

        if (! $user->isAdmin() && ! in_array($user->role, $roles, true)) {
            abort(403, 'Vous n’avez pas accès à cet espace.');
        }

        return $next($request);
    }
}
