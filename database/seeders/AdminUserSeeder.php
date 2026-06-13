<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@weddingvelour.com'],
            [
                'name' => 'Administrateur Wedding Velour',
                'password' => Hash::make('P@ssword2026!'),
                'role' => 'admin',
                'wedding_id' => null,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
    }
}
