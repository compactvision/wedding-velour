<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OnboardingProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_open_the_multi_event_onboarding(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->get('/onboarding')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Onboarding')
                ->has('eventTypes', 7)
                ->where('eventTypes.0.slug', 'wedding')
                ->has('eventTypes.0.modules'));
    }

    public function test_onboarding_provisions_a_tenant_and_opens_payment_before_activation(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
            'locale' => 'fr',
            'timezone' => 'Africa/Kinshasa',
        ]);
        app(FoundationCatalogService::class)->seed();
        $conference = EventType::query()->where('slug', 'conference')->firstOrFail();

        $payload = [
            'organization_mode' => 'new',
            'organization_id' => null,
            'organization_name' => 'Studio Kivu',
            'organization_type' => 'agency',
            'event_type_id' => $conference->id,
            'event_name' => 'Forum Créatif 2027',
            'starts_at' => '2027-03-12',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Horizon',
            'venue_address' => '12 avenue des Arts',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 450,
            'modules' => ['ticketing', 'badges', 'analytics'],
        ];
        $preview = $this->actingAs($user)->postJson('/onboarding/quote', [
            'event_type_id' => $conference->id,
            'estimated_guests' => 450,
            'modules' => $payload['modules'],
        ])->assertOk()
            ->assertJsonPath('data.metrics.estimated_guests', 450)
            ->json('data');
        $payload['pricing_signature'] = $preview['signature'];
        $payload['idempotency_key'] = 'onboarding-payment-key-001';
        config()->set('payments.default_provider', 'rdcard');
        config()->set('payments.rdcard.environment', 'sandbox');
        config()->set('payments.rdcard.base_url', null);
        config()->set('payments.rdcard.api_key', 'rdcard-onboarding-key');
        config()->set('payments.rdcard.secret', 'rdcard-onboarding-secret');
        Http::fake([
            'https://sandbox.checkout.rdcard.net/api/v1/sessions' => Http::response([
                'id' => 'sess_onboarding_001',
                'checkoutUrl' => 'https://sandbox.checkout.rdcard.net/pay/sess_onboarding_001',
                'amount' => $preview['total_minor'] / 100,
                'currency' => $preview['currency'],
            ]),
        ]);
        $this->assertDatabaseCount('events', 0);

        $response = $this->actingAs($user)->postJson('/onboarding', $payload);

        $organization = Organization::query()->where('slug', 'studio-kivu')->firstOrFail();
        $event = Event::query()->where('organization_id', $organization->id)->firstOrFail();

        $response
            ->assertCreated()
            ->assertJsonPath('data.event_id', $event->id)
            ->assertJsonPath('data.checkout_url', 'https://sandbox.checkout.rdcard.net/pay/sess_onboarding_001')
            ->assertSessionHas('active_organization_id', $organization->id)
            ->assertSessionHas('active_event_id', $event->id);

        $this->assertEquals($user->id, $organization->owner_user_id);
        $this->assertSame('conference', $event->type->slug);
        $this->assertSame('pending_payment', $event->status);
        $this->assertSame(450, $event->estimated_guests);
        $this->assertDatabaseHas('payments', [
            'event_id' => $event->id,
            'amount_minor' => $preview['total_minor'],
            'status' => 'pending',
            'provider' => 'rdcard',
        ]);
        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('event_members', [
            'event_id' => $event->id,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('event_settings', [
            'organization_id' => $organization->id,
            'event_id' => $event->id,
        ]);

        $enabledSlugs = $event->enabledModules()->pluck('slug');
        $this->assertContains('ticketing', $enabledSlugs);
        $this->assertContains('badges', $enabledSlugs);
        $this->assertContains('guests', $enabledSlugs);
        $this->assertContains('qr_access', $enabledSlugs);
        $this->assertContains('schedule', $enabledSlugs);

        $this->actingAs($user)
            ->withSession([
                'active_organization_id' => $organization->id,
                'active_event_id' => $event->id,
            ])
            ->get('/workspace')
            ->assertRedirect(route('transactions'));

        $this->actingAs($user)
            ->getJson("/api/organizations/{$organization->slug}/events/{$event->slug}/guests")
            ->assertStatus(402);
    }

    public function test_quote_is_shown_before_creation_and_changes_with_guests_and_modules(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();
        $wedding = EventType::query()->where('slug', 'wedding')->firstOrFail();

        $small = $this->actingAs($user)->postJson('/onboarding/quote', [
            'event_type_id' => $wedding->id,
            'estimated_guests' => 50,
            'modules' => ['guests', 'invitations'],
        ])->assertOk()->json('data');
        $large = $this->actingAs($user)->postJson('/onboarding/quote', [
            'event_type_id' => $wedding->id,
            'estimated_guests' => 700,
            'modules' => ['guests', 'invitations', 'budget', 'vendors', 'media'],
        ])->assertOk()->json('data');

        $this->assertDatabaseCount('events', 0);
        $this->assertGreaterThan($small['total_minor'], $large['total_minor']);
        $this->assertGreaterThanOrEqual(2, count($small['lines']));
        $this->assertSame(50, $small['metrics']['estimated_guests']);
        $this->assertNotSame($small['signature'], $large['signature']);
    }

    public function test_user_cannot_create_or_select_an_event_in_another_tenant(): void
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $outsider = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'wedding')->firstOrFail();
        $organization = Organization::query()->create([
            'id' => fake()->uuid(),
            'owner_user_id' => $owner->id,
            'name' => 'Privée',
            'slug' => 'privee',
            'status' => 'active',
            'timezone' => 'Africa/Kinshasa',
        ]);
        $event = Event::query()->create([
            'id' => fake()->uuid(),
            'organization_id' => $organization->id,
            'event_type_id' => $type->id,
            'created_by_user_id' => $owner->id,
            'name' => 'Événement privé',
            'slug' => 'evenement-prive',
            'status' => 'active',
            'timezone' => 'Africa/Kinshasa',
        ]);

        $payload = [
            'organization_mode' => 'existing',
            'organization_id' => $organization->id,
            'organization_name' => null,
            'organization_type' => 'personal',
            'event_type_id' => $type->id,
            'event_name' => 'Intrusion',
            'starts_at' => '2027-01-01',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => null,
            'venue_address' => null,
            'city' => null,
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 10,
            'modules' => [],
        ];
        $payload['pricing_signature'] = $this->actingAs($outsider)->postJson('/onboarding/quote', [
            'event_type_id' => $type->id,
            'estimated_guests' => 10,
            'modules' => [],
        ])->assertOk()->json('data.signature');
        $payload['idempotency_key'] = 'forbidden-onboarding-key-001';

        $this->actingAs($outsider)->postJson('/onboarding', $payload)->assertNotFound();
        $this->actingAs($outsider)->post('/workspace/select', [
            'organization_id' => $organization->id,
            'event_id' => $event->id,
        ])->assertNotFound();

        $this->assertDatabaseMissing('events', ['name' => 'Intrusion']);
    }
}
