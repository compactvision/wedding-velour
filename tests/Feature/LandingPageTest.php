<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_page_is_public(): void
    {
        Plan::query()->where('slug', 'essential')->update([
            'base_price_minor' => 4200,
            'currency' => 'USD',
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->has('plans', 4)
                ->where('plans.0.slug', 'essential')
                ->where('plans.0.base_price_minor', 4200)
                ->where('plans.0.currency', 'USD'));
    }

    public function test_authenticated_manager_without_an_event_starts_onboarding(): void
    {
        $manager = User::factory()->create(['role' => 'manager', 'is_active' => true]);

        $this->actingAs($manager)
            ->get('/dashboard')
            ->assertRedirect(route('onboarding'));
        $this->actingAs($manager)->get('/home')->assertRedirect(route('dashboard'));
    }
}
