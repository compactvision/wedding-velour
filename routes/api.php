<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EntityController;
use App\Http\Controllers\Api\UploadController;

Route::get('/entities/{entity}', [EntityController::class, 'index']);
Route::get('/entities/{entity}/{id}', [EntityController::class, 'show']);
Route::post('/entities/{entity}', [EntityController::class, 'store']);
Route::put('/entities/{entity}/{id}', [EntityController::class, 'update']);
Route::delete('/entities/{entity}/{id}', [EntityController::class, 'destroy']);

Route::post('/upload', [UploadController::class, 'upload']);
