<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlatformAdminController extends Controller
{
    public function index(): Response
    {
        $plans = Plan::query()
            ->withCount([
                'subscriptions',
                'subscriptions as active_subscriptions_count' => fn ($query) => $query
                    ->where('status', 'active'),
            ])
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('SuperAdminDashboard', [
            'stats' => [
                'users' => User::query()->where('role', '!=', 'superadmin')->count(),
                'active_users' => User::query()
                    ->where('role', '!=', 'superadmin')
                    ->where('is_active', true)
                    ->count(),
                'organizations' => Organization::query()->count(),
                'events' => Event::query()->count(),
                'active_subscriptions' => Subscription::query()->where('status', 'active')->count(),
                'revenue_minor' => (int) Payment::query()->where('status', 'paid')->sum('amount_minor'),
            ],
            'plans' => $plans->map(fn (Plan $plan) => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'currency' => $plan->currency,
                'base_price_minor' => $plan->base_price_minor,
                'subscriptions_count' => $plan->subscriptions_count,
                'active_subscriptions_count' => $plan->active_subscriptions_count,
            ]),
            'payments' => Payment::query()
                ->with(['organization:id,name', 'event:id,name', 'subscription.plan:id,name'])
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'organization' => $payment->organization?->name,
                    'event' => $payment->event?->name,
                    'plan' => $payment->subscription?->plan?->name,
                    'amount_minor' => $payment->amount_minor,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'provider' => $payment->provider,
                    'reference' => $payment->external_reference,
                    'created_at' => $payment->created_at?->toIso8601String(),
                ]),
            'subscriptions' => Subscription::query()
                ->with(['organization:id,name', 'event:id,name', 'plan:id,name'])
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (Subscription $subscription) => [
                    'id' => $subscription->id,
                    'organization' => $subscription->organization?->name,
                    'event' => $subscription->event?->name,
                    'plan' => $subscription->plan?->name,
                    'status' => $subscription->status,
                    'starts_at' => $subscription->starts_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                ]),
            'users' => User::query()
                ->where('role', '!=', 'superadmin')
                ->latest()
                ->limit(100)
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                    'is_active' => $user->is_active,
                    'created_at' => $user->created_at?->toIso8601String(),
                ]),
        ]);
    }

    public function updateUser(Request $request, User $user): RedirectResponse
    {
        abort_if($user->isSuperAdmin(), 403, 'Le compte superadmin ne peut pas être modifié ici.');

        $data = $request->validate([
            'role' => ['required', Rule::in(['admin', 'manager', 'server', 'door'])],
            'is_active' => ['required', 'boolean'],
        ]);
        $user->update([
            ...$data,
            'status' => $data['is_active'] ? 'active' : 'suspended',
        ]);

        return back()->with('success', "Le compte de {$user->name} a été mis à jour.");
    }
}
