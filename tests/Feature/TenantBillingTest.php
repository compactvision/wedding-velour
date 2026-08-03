<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\PricingQuote;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_server_calculates_and_persists_an_immutable_quote(): void
    {
        [$owner, $organization, $event] = $this->createTenant(
            'devis',
            estimatedGuests: 230,
        );
        $url = $this->billingUrl($organization, $event);

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonCount(4, 'data.plans')
            ->assertJsonPath('data.metrics.estimated_guests', 230);

        $response = $this->actingAs($owner)->postJson("{$url}/quotes", [
            'plan_slug' => 'essential',
            'total_minor' => 1,
            'currency' => 'XXX',
        ]);
        $response
            ->assertCreated()
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.subtotal_minor', 26500)
            ->assertJsonPath('data.total_minor', 26500)
            ->assertJsonPath('data.inputs.estimated_guests', 230)
            ->assertJsonPath('data.lines.0.amount_minor', 2900)
            ->assertJsonPath('data.lines.1.quantity', 230)
            ->assertJsonPath('data.lines.1.unit_amount_minor', 100)
            ->assertJsonPath('data.lines.1.amount_minor', 23000)
            ->assertJsonPath('data.lines.2.quantity', 4)
            ->assertJsonPath('data.lines.2.unit_amount_minor', 150)
            ->assertJsonPath('data.lines.2.amount_minor', 600)
            ->assertJsonCount(3, 'data.lines');

        $quote = PricingQuote::query()->firstOrFail();
        $this->assertSame(26500, $quote->total_minor);
        $this->assertSame(64, strlen($quote->integrity_hash));
        $this->assertSame('planivo-pricing-v2', $quote->engine_version);

        $this->actingAs($owner)
            ->putJson("{$url}/quotes/{$quote->id}", ['total_minor' => 1])
            ->assertNotFound();
        $this->assertSame(26500, $quote->fresh()->total_minor);
    }

    public function test_enterprise_plan_requires_a_custom_offer(): void
    {
        [$owner, $organization, $event] = $this->createTenant('entreprise');

        $this->actingAs($owner)
            ->postJson($this->billingUrl($organization, $event).'/quotes', [
                'plan_slug' => 'enterprise',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('plan_slug');

        $this->assertDatabaseCount('pricing_quotes', 0);
    }

    public function test_event_organizer_can_view_but_cannot_create_quotes(): void
    {
        [, $organization, $event] = $this->createTenant('lecture-devis');
        $organizer = $this->assignRole($organization, $event, 'event_organizer');
        $url = $this->billingUrl($organization, $event);

        $this->actingAs($organizer)->getJson($url)->assertOk();
        $this->actingAs($organizer)
            ->postJson("{$url}/quotes", ['plan_slug' => 'standard'])
            ->assertForbidden();
    }

    public function test_pricing_quotes_are_isolated_between_organizations(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('prix-a');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('prix-b');
        $this->actingAs($ownerA)
            ->postJson($this->billingUrl($organizationA, $eventA).'/quotes', [
                'plan_slug' => 'standard',
            ])
            ->assertCreated();

        $this->actingAs($ownerB)
            ->getJson($this->billingUrl($organizationB, $eventB))
            ->assertOk()
            ->assertJsonCount(0, 'data.quotes');
        $this->actingAs($ownerA)
            ->getJson($this->billingUrl($organizationB, $eventB))
            ->assertForbidden();
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(
        string $name,
        int $estimatedGuests = 100,
    ): array {
        $owner = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();
        $eventType = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => $name,
            'organization_type' => 'business',
            'event_type_id' => $eventType->id,
            'event_name' => "Événement {$name}",
            'starts_at' => '2027-11-10',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => $estimatedGuests,
            'modules' => [],
        ]);

        return [$owner, $result['organization'], $result['event']];
    }

    private function assignRole(
        Organization $organization,
        Event $event,
        string $roleSlug,
    ): User {
        $user = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);
        $member = OrganizationMember::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $eventMember = EventMember::query()->create([
            'id' => (string) Str::uuid(),
            'event_id' => $event->id,
            'organization_member_id' => $member->id,
            'status' => 'active',
            'assigned_at' => now(),
        ]);
        $eventMember->roles()->attach(
            Role::query()
                ->where('organization_id', $organization->id)
                ->where('slug', $roleSlug)
                ->firstOrFail(),
        );

        return $user;
    }

    private function billingUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/billing";
    }
}
