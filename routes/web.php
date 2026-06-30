<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::get('/home', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'))
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

Route::middleware(['auth', 'role:manager'])->group(function () {
    Route::get('/', fn () => Inertia::render('Dashboard'))->name('dashboard');
    Route::get('/guests', fn () => Inertia::render('Guests'))->name('guests');
    Route::get('/tables', fn () => Inertia::render('Tables'))->name('tables');
    Route::get('/menu-admin', fn () => Inertia::render('MenuAdmin'))->name('menu-admin');
    Route::get('/orders', fn () => Inertia::render('Orders'))->name('orders');
    Route::get('/timeline', fn () => Inertia::render('Timeline'))->name('timeline');
    Route::get('/custom-invitation', fn () => Inertia::render('CustomInvitation'))->name('custom-invitation');
    Route::get('/photos', fn () => Inertia::render('Photos'))->name('photos');
    Route::get('/notifications', fn () => Inertia::render('Notifications'))->name('notifications');
    Route::get('/manager', fn () => Inertia::render('ManagerDashboard'))->name('manager');
});

Route::middleware(['auth', 'role:server'])->group(function () {
    Route::get('/server', fn () => Inertia::render('ServerInterface'))->name('server');
});

Route::middleware(['auth', 'role:door'])->group(function () {
    Route::get('/door', fn () => Inertia::render('DoorAgent'))->name('door');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/agents', fn () => Inertia::render('Agents'))->name('agents');
    Route::get('/api/agents', [AgentController::class, 'index']);
    Route::post('/api/agents', [AgentController::class, 'store']);
    Route::put('/api/agents/{agent}', [AgentController::class, 'update']);
    Route::delete('/api/agents/{agent}', [AgentController::class, 'destroy']);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
