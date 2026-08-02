<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $this->get('/register')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/Register'));
    }

    public function test_new_users_can_register_and_are_sent_to_onboarding(): void
    {
        $response = $this->post('/register', [
            'name' => 'Marie Kabamba',
            'email' => 'MARIE@example.com',
            'password' => 'mot-de-passe-solide',
            'password_confirmation' => 'mot-de-passe-solide',
        ]);

        $user = User::query()->where('email', 'marie@example.com')->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('onboarding'));
        $this->assertSame('manager', $user->role);
        $this->assertTrue($user->is_active);
        $this->assertSame('active', $user->status);
        $this->assertTrue(Hash::check('mot-de-passe-solide', $user->password));
    }

    public function test_registration_requires_a_unique_email_and_confirmed_password(): void
    {
        User::factory()->create(['email' => 'marie@example.com']);

        $this->post('/register', [
            'name' => 'Marie Kabamba',
            'email' => 'marie@example.com',
            'password' => 'mot-de-passe-solide',
            'password_confirmation' => 'autre-mot-de-passe',
        ])->assertSessionHasErrors(['email', 'password']);

        $this->assertGuest();
    }

    public function test_manager_is_sent_to_the_guided_event_journey_after_login(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->post('/login', [
            'email' => $manager->email,
            'password' => 'password',
        ])->assertRedirect('/onboarding');

        $this->assertAuthenticatedAs($manager);
    }
}
