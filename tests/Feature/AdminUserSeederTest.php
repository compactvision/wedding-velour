<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_only_the_superadmin_user(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', [
            'email' => 'admin@weddingvelour.com',
            'role' => 'superadmin',
            'wedding_id' => null,
            'is_active' => true,
        ]);
        $this->assertNotNull(
            User::where('email', 'admin@weddingvelour.com')->firstOrFail()->email_verified_at
        );
    }
}
