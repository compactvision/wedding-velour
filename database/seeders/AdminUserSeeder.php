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
            ['email' => config('planivo.platform_admin_email')],
            [
                'name' => 'Superadministrateur Planivo',
                'password' => Hash::make(config('app.admin_password')),
                'role' => 'superadmin',
                'wedding_id' => null,
                'is_active' => true,
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );
    }
}
