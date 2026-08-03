<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Models\EventType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlatformAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_superadmin_can_open_the_platform_console(): void
    {
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();

        $this->actingAs($superadmin)
            ->get('/superadmin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SuperAdminDashboard')
                ->where('stats.users', 1)
                ->has('plans', 4)
                ->has('users', 1));

        $this->actingAs($admin)->get('/superadmin')->assertForbidden();
        $this->actingAs($admin)->get('/settings/pricing')->assertForbidden();
    }

    public function test_superadmin_can_manage_a_user_without_exposing_its_own_account(): void
    {
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($superadmin)
            ->patch("/superadmin/users/{$user->id}", [
                'role' => 'door',
                'is_active' => false,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'door',
            'is_active' => false,
            'status' => 'suspended',
        ]);

        $this->actingAs($superadmin)
            ->patch("/superadmin/users/{$superadmin->id}", [
                'role' => 'manager',
                'is_active' => false,
            ])
            ->assertForbidden();
    }

    public function test_superadmin_can_browse_search_and_paginate_all_users(): void
    {
        $superadmin = User::factory()->create([
            'name' => 'Root Planivo',
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);
        User::factory()->count(25)->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);
        $admin = User::factory()->create([
            'name' => 'Alice Administration',
            'email' => 'alice@planivo.test',
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($superadmin)
            ->get('/superadmin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SuperAdminUsers')
                ->has('users.data', 20)
                ->where('users.total', 27));

        $this->actingAs($superadmin)
            ->get('/superadmin/users?search=Alice&role=admin&status=active')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SuperAdminUsers')
                ->has('users.data', 1)
                ->where('users.data.0.email', 'alice@planivo.test')
                ->where('filters.role', 'admin'));

        $this->actingAs($admin)->get('/superadmin/users')->assertForbidden();
    }

    public function test_superadmin_is_sent_to_its_console_after_login(): void
    {
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->post('/login', [
            'email' => $superadmin->email,
            'password' => 'password',
        ])->assertRedirect('/superadmin');
    }

    public function test_superadmin_can_enable_and_disable_an_event_type(): void
    {
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $organizer = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $catalog = app(FoundationCatalogService::class);
        $catalog->seed();
        $wedding = EventType::query()->where('slug', 'wedding')->firstOrFail();

        $this->actingAs($superadmin)
            ->get('/superadmin/event-types')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SuperAdminEventTypes')
                ->has('eventTypes', 7)
                ->where('eventTypes.0.slug', 'wedding'));

        $this->actingAs($superadmin)
            ->post("/superadmin/event-types/{$wedding->id}/status", [
                'is_active' => false,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertSame('inactive', $wedding->fresh()->status);

        $catalog->seed();
        $this->assertSame('inactive', $wedding->fresh()->status);

        $this->actingAs($organizer)
            ->get('/onboarding')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('eventTypes', 6)
                ->where('eventTypes.0.slug', 'birthday'));

        $this->actingAs($organizer)
            ->postJson('/onboarding/quote', [
                'event_type_id' => $wedding->id,
                'estimated_guests' => 100,
                'modules' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_type_id');

        $this->actingAs($superadmin)
            ->post("/superadmin/event-types/{$wedding->id}/status", [
                'is_active' => true,
            ])
            ->assertRedirect();
        $this->assertSame('active', $wedding->fresh()->status);

        $this->actingAs($organizer)
            ->post("/superadmin/event-types/{$wedding->id}/status", [
                'is_active' => false,
            ])
            ->assertForbidden();
    }
}
