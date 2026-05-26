<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function() {
    return Inertia::render('Dashboard');
})->name('dashboard');
Route::get('/guests', function() {
    return Inertia::render('Guests');
})->name('guests');
Route::get('/tables', function() {
    return Inertia::render('Tables');
})->name('tables');
Route::get('/menu-admin', function() {
    return Inertia::render('MenuAdmin');
})->name('menu-admin');
Route::get('/orders', function() {
    return Inertia::render('Orders');
})->name('orders');
Route::get('/timeline', function() {
    return Inertia::render('Timeline');
})->name('timeline');
Route::get('/photos', function() {
    return Inertia::render('Photos');
})->name('photos');
Route::get('/notifications', function() {
    return Inertia::render('Notifications');
})->name('notifications');
Route::get('/manager', function() {
    return Inertia::render('ManagerDashboard');
})->name('manager');
Route::get('/server', function() {
    return Inertia::render('ServerInterface');
})->name('server');
Route::get('/door', function() {
    return Inertia::render('DoorAgent');
})->name('door');
Route::get('/invitation', function() {
    return Inertia::render('Invitation');
})->name('invitation');
Route::get('/guest-portal', function() {
    return Inertia::render('GuestPortal');
})->name('guest-portal');
Route::get('/table-menu', function() {
    return Inertia::render('TableMenu');
})->name('table-menu');

// Auth
Route::post('/logout', function () {
    auth()->logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/');
})->name('logout');
