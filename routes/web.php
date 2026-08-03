<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PlatformAdminController;
use App\Http\Controllers\PlatformPricingController;
use App\Http\Controllers\PlatformTransactionController;
use App\Http\Controllers\PublicGalleryController;
use App\Http\Controllers\TeamInvitationController;
use App\Models\Plan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);
});

Route::get('/', function () {
    $now = now();

    return Inertia::render('welcome', [
        'plans' => Plan::query()
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('valid_from')->orWhere('valid_from', '<=', $now))
            ->where(fn ($query) => $query->whereNull('valid_until')->orWhere('valid_until', '>=', $now))
            ->with(['rules' => fn ($query) => $query->where('status', 'active')])
            ->orderBy('sort_order')
            ->get()
            ->map(function (Plan $plan) {
                $guestRule = $plan->rules->first(fn ($rule) => ($rule->condition['metric'] ?? null) === 'estimated_guests');
                $moduleRule = $plan->rules->first(fn ($rule) => ($rule->condition['metric'] ?? null) === 'enabled_modules'
                    && array_key_exists('included_quantity', $rule->condition ?? []));

                return [
                    'slug' => $plan->slug,
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'billing_model' => $plan->billing_model,
                    'currency' => $plan->currency,
                    'base_price_minor' => $plan->base_price_minor,
                    'guest_price_minor' => (int) ($guestRule?->amount_minor ?? 0),
                    'module_price_minor' => (int) ($moduleRule?->amount_minor ?? 0),
                    'limits' => $plan->limits ?? [],
                ];
            }),
    ]);
})->name('landing');

Route::get('/home', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'landing'))
    ->name('home');

Route::get('/invitation', function () {
    return Inertia::render('Invitation');
})->name('invitation');
Route::get('/guest-portal', function () {
    return Inertia::render('GuestPortal');
})->name('guest-portal');
Route::get('/table-menu', function () {
    return Inertia::render('TableMenu');
})->name('table-menu');
Route::get('/gallery/{token}', [PublicGalleryController::class, 'show'])->name('public-gallery.show');
Route::get('/gallery/{token}/media/{photo}', [PublicGalleryController::class, 'content'])->name('public-gallery.content');
Route::get('/gallery/{token}/media/{photo}/download', [PublicGalleryController::class, 'download'])->name('public-gallery.download');

Route::middleware('auth')->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding');
    Route::post('/onboarding/quote', [OnboardingController::class, 'quote'])->name('onboarding.quote');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::get('/workspace', [OnboardingController::class, 'workspace'])->name('workspace');
    Route::post('/workspace/select', [OnboardingController::class, 'select'])->name('workspace.select');
    Route::get('/payments/success', fn () => Inertia::render('PaymentSuccess', [
        'reference' => request()->string('reference')->limit(255)->toString(),
    ]))->name('payments.success');
    Route::get('/payments/failed', fn () => Inertia::render('PaymentFailed', [
        'reference' => request()->string('reference')->limit(255)->toString(),
    ]))->name('payments.failed');
    Route::get('/team/invitations/{token}', [TeamInvitationController::class, 'show'])->name('team-invitations.show');
    Route::post('/team/invitations/{token}', [TeamInvitationController::class, 'accept'])->name('team-invitations.accept');
});

Route::middleware(['auth', 'role:superadmin'])->group(function () {
    Route::get('/superadmin', [PlatformAdminController::class, 'index'])->name('superadmin.dashboard');
    Route::get('/superadmin/users', [PlatformAdminController::class, 'users'])->name('superadmin.users');
    Route::get('/superadmin/event-types', [PlatformAdminController::class, 'eventTypes'])->name('superadmin.event-types');
    Route::get('/superadmin/transactions', [PlatformTransactionController::class, 'index'])->name('superadmin.transactions');
    Route::get('/superadmin/transactions/{payment}/receipt', [PlatformTransactionController::class, 'receipt'])->name('superadmin.transactions.receipt');
    Route::patch('/superadmin/users/{user}', [PlatformAdminController::class, 'updateUser'])->name('superadmin.users.update');
    Route::patch('/superadmin/event-types/{eventType}', [PlatformAdminController::class, 'updateEventType'])->name('superadmin.event-types.update');
    Route::get('/settings/pricing', [PlatformPricingController::class, 'show'])->name('pricing-settings');
    Route::put('/settings/pricing', [PlatformPricingController::class, 'update'])->name('pricing-settings.update');
});

Route::middleware(['auth', 'role:manager'])->group(function () {
    Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->middleware('feature:*,event.view')->name('dashboard');
    Route::get('/guests', fn () => Inertia::render('Guests'))->middleware('feature:guests,guests.view')->name('guests');
    Route::get('/tables', fn () => Inertia::render('Tables'))->middleware('feature:seating,seating.view')->name('tables');
    Route::get('/menu-admin', fn () => Inertia::render('MenuAdmin'))->middleware('feature:catering,catering.view')->name('menu-admin');
    Route::get('/orders', fn () => Inertia::render('Orders'))->middleware('feature:catering,catering.view')->name('orders');
    Route::get('/timeline', fn () => Inertia::render('Timeline'))->middleware('feature:schedule,schedule.view')->name('timeline');
    Route::get('/custom-invitation', fn () => Inertia::render('CustomInvitation'))->middleware('feature:invitations,invitations.view')->name('custom-invitation');
    Route::get('/photos', fn () => Inertia::render('Photos'))->middleware('feature:media|gallery,media.view')->name('photos');
    Route::get('/notifications', fn () => Inertia::render('Notifications'))->middleware('feature:notifications,notifications.view')->name('notifications');
    Route::get('/manager', fn () => Inertia::render('ManagerDashboard'))->middleware('feature:analytics,event.update')->name('manager');
    Route::get('/agents', fn () => Inertia::render('Agents'))->middleware('feature:staff,team.view')->name('agents');
    Route::get('/budget', fn () => Inertia::render('Budget'))->middleware('feature:budget,budget.view')->name('budget');
    Route::get('/inventory', fn () => Inertia::render('Inventory'))->middleware('feature:stock|purchasing,stock.view')->name('inventory');
    Route::get('/vendors', fn () => Inertia::render('Vendors'))->middleware('feature:vendors|contracts,vendors.view')->name('vendors');
    Route::get('/documents', fn () => Inertia::render('Documents'))->middleware('feature:documents,documents.view')->name('documents');
    Route::get('/ticketing', fn () => Inertia::render('Ticketing'))->middleware('feature:ticketing,ticketing.view')->name('ticketing');
    Route::get('/badges', fn () => Inertia::render('Badges'))->middleware('feature:badges,badges.view')->name('badges');
    Route::get('/checkout', fn () => Inertia::render('Billing'))->middleware('feature:*,billing.view')->name('checkout');
    Route::get('/transactions', fn () => Inertia::render('Transactions'))->middleware('feature:*,payments.view')->name('transactions');
});

Route::middleware(['auth', 'role:server'])->group(function () {
    Route::get('/server', fn () => Inertia::render('ServerInterface'))->name('server');
});

Route::middleware(['auth', 'role:door'])->group(function () {
    Route::get('/door', fn () => Inertia::render('DoorAgent'))->name('door');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/api/agents', [AgentController::class, 'index']);
    Route::post('/api/agents', [AgentController::class, 'store']);
    Route::put('/api/agents/{agent}', [AgentController::class, 'update']);
    Route::delete('/api/agents/{agent}', [AgentController::class, 'destroy']);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
