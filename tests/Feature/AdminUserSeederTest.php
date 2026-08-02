<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_superadmin_seeder_is_idempotent_and_uses_configured_credentials(): void
    {
        config()->set('planivo.platform_admin_email', 'root@planivo.test');
        config()->set('app.admin_password', 'SecurePassword!42');

        $this->seed(SuperAdminSeeder::class);
        $this->seed(SuperAdminSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $superadmin = User::where('email', 'root@planivo.test')->firstOrFail();

        $this->assertSame('superadmin', $superadmin->role);
        $this->assertTrue($superadmin->is_active);
        $this->assertSame('active', $superadmin->status);
        $this->assertTrue(Hash::check('SecurePassword!42', $superadmin->password));
    }
}
