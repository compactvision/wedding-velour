<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Models\Plan;
use App\Models\PricingRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlatformPricingSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_configure_guest_and_module_pricing(): void
    {
        $admin = User::factory()->create([
            'email' => config('planivo.platform_admin_email'),
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();

        $this->actingAs($admin)->get('/settings/pricing')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PricingSettings')
                ->has('plans', 3));

        $plans = Plan::query()->where('billing_model', '!=', 'enterprise')->orderBy('sort_order')->get();
        $payload = $plans->map(fn (Plan $plan) => [
            'slug' => $plan->slug,
            'base_price_minor' => $plan->slug === 'essential' ? 3500 : $plan->base_price_minor,
            'max_guests' => $plan->slug === 'essential' ? 120 : $plan->limits['max_guests'],
            'guest_price_minor' => $plan->slug === 'essential' ? 60 : 40,
            'included_modules' => $plan->slug === 'essential' ? 4 : 6,
            'module_price_minor' => $plan->slug === 'essential' ? 175 : 100,
        ])->all();

        $this->actingAs($admin)->put('/settings/pricing', ['plans' => $payload])
            ->assertRedirect()
            ->assertSessionHas('success');

        $essential = Plan::query()->where('slug', 'essential')->firstOrFail();
        $this->assertSame(3500, $essential->base_price_minor);
        $this->assertSame(120, $essential->limits['max_guests']);
        $moduleRule = PricingRule::query()
            ->where('plan_id', $essential->id)
            ->get()
            ->first(fn (PricingRule $rule) => array_key_exists('included_quantity', $rule->condition ?? []));
        $this->assertSame(4, $moduleRule->condition['included_quantity']);
        $this->assertSame(175, $moduleRule->amount_minor);
    }

    public function test_regular_organization_admin_cannot_change_platform_prices(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($user)->get('/settings/pricing')->assertForbidden();
        $this->actingAs($user)->put('/settings/pricing', ['plans' => []])->assertForbidden();
    }
}
