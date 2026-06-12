<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $this->get('/')->assertRedirect(route('login'));
        $this->get('/door')->assertRedirect(route('login'));
        $this->get('/server')->assertRedirect(route('login'));
    }

    public function test_door_agent_only_accesses_the_door_workspace(): void
    {
        $agent = User::factory()->create([
            'role' => 'door',
            'is_active' => true,
        ]);

        $this->actingAs($agent)->get('/door')->assertOk();
        $this->actingAs($agent)->get('/')->assertForbidden();
        $this->actingAs($agent)->get('/server')->assertForbidden();
    }

    public function test_server_only_accesses_the_server_workspace(): void
    {
        $agent = User::factory()->create([
            'role' => 'server',
            'is_active' => true,
        ]);

        $this->actingAs($agent)->get('/server')->assertOk();
        $this->actingAs($agent)->get('/door')->assertForbidden();
        $this->actingAs($agent)->get('/agents')->assertForbidden();
    }

    public function test_admin_can_manage_agents(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->actingAs($admin)->get('/agents')->assertOk();
        $this->actingAs($admin)->getJson('/api/agents')->assertOk();
    }
}
