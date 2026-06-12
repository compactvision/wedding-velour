<?php

use App\Http\Controllers\Api\EntityController;
use App\Http\Controllers\Api\PublicWeddingController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function () {
    Route::get('/invitations/{token}', [PublicWeddingController::class, 'invitation']);
    Route::put('/invitations/{token}', [PublicWeddingController::class, 'respond']);
    Route::post('/invitations/{token}/orders', [PublicWeddingController::class, 'invitationOrder']);
    Route::get('/table-menus/{table}', [PublicWeddingController::class, 'tableMenu']);
    Route::post('/table-menus/{table}/orders', [PublicWeddingController::class, 'tableOrder']);
});

Route::middleware(['web', 'auth'])->group(function () {
    Route::get('/entities/{entity}', [EntityController::class, 'index']);
    Route::get('/entities/{entity}/{id}', [EntityController::class, 'show']);
    Route::post('/entities/{entity}', [EntityController::class, 'store']);
    Route::put('/entities/{entity}/{id}', [EntityController::class, 'update']);
    Route::delete('/entities/{entity}/{id}', [EntityController::class, 'destroy']);
    Route::post('/upload', [UploadController::class, 'upload']);
});
