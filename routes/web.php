<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Dashboard')->name('dashboard');
Route::inertia('/guests', 'Guests')->name('guests');
Route::inertia('/tables', 'Tables')->name('tables');
Route::inertia('/menu-admin', 'MenuAdmin')->name('menu-admin');
Route::inertia('/orders', 'Orders')->name('orders');
Route::inertia('/timeline', 'Timeline')->name('timeline');
Route::inertia('/photos', 'Photos')->name('photos');
Route::inertia('/notifications', 'Notifications')->name('notifications');
Route::inertia('/manager', 'ManagerDashboard')->name('manager');
Route::inertia('/server', 'ServerInterface')->name('server');
Route::inertia('/door', 'DoorAgent')->name('door');
Route::inertia('/invitation', 'Invitation')->name('invitation');
Route::inertia('/guest-portal', 'GuestPortal')->name('guest-portal');
Route::inertia('/table-menu', 'TableMenu')->name('table-menu');

// Auth
Route::post('/logout', function () {
    auth()->logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/');
})->name('logout');
