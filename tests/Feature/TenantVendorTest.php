<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantVendorTest extends TestCase
{
    use RefreshDatabase;

    public function test_contract_lifecycle_and_installment_payment_are_tracked(): void
    {
        [$owner, $organization, $event] = $this->createTenant('vendors');
        $url = $this->vendorsUrl($organization, $event);
        $vendorId = $this->actingAs($owner)
            ->postJson($url, [
                'name' => 'Studio Lumière',
                'category' => 'Photographie',
                'contact_name' => 'Amina',
                'email' => 'contact@studio.test',
            ])
            ->assertCreated()
            ->json('data.id');
        $contractId = $this->actingAs($owner)
            ->postJson($this->contractsUrl($organization, $event), [
                'event_vendor_id' => $vendorId,
                'title' => 'Reportage photo complet',
                'value_minor' => 200000,
                'starts_on' => '2027-11-01',
                'ends_on' => '2027-11-11',
                'installments' => [[
                    'label' => 'Acompte',
                    'amount_minor' => 50000,
                    'due_on' => '2027-10-01',
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->json('data.id');
        $installmentId = $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.contracted_minor', 200000)
            ->json('data.contracts.0.installments.0.id');

        $this->actingAs($owner)
            ->putJson($this->installmentsUrl($organization, $event)."/{$installmentId}/paid")
            ->assertUnprocessable();
        foreach (['submit', 'sign', 'activate'] as $action) {
            $this->actingAs($owner)
                ->putJson(
                    $this->contractsUrl($organization, $event)."/{$contractId}/transition",
                    compact('action'),
                )
                ->assertOk();
        }
        $this->actingAs($owner)
            ->putJson($this->installmentsUrl($organization, $event)."/{$installmentId}/paid")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->actingAs($owner)
            ->getJson($url)
            ->assertJsonPath('data.summary.paid_minor', 50000)
            ->assertJsonPath('data.summary.remaining_minor', 150000)
            ->assertJsonPath('data.contracts.0.status', 'active');
    }

    public function test_installments_cannot_exceed_contract_value(): void
    {
        [$owner, $organization, $event] = $this->createTenant('contract-total');
        $vendorId = $this->actingAs($owner)
            ->postJson($this->vendorsUrl($organization, $event), [
                'name' => 'Traiteur Saveurs',
                'category' => 'Traiteur',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($owner)
            ->postJson($this->contractsUrl($organization, $event), [
                'event_vendor_id' => $vendorId,
                'title' => 'Dîner',
                'value_minor' => 10000,
                'installments' => [[
                    'label' => 'Paiement',
                    'amount_minor' => 10001,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('installments');
    }

    public function test_vendor_manager_permissions_and_tenant_boundaries_are_enforced(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('vendor-a');
        [, $organizationB, $eventB] = $this->createTenant('vendor-b');
        $manager = $this->assignRole($organizationA, $eventA, 'vendor_manager');
        $door = $this->assignRole($organizationA, $eventA, 'access_controller');
        $urlA = $this->vendorsUrl($organizationA, $eventA);
        $vendorId = $this->actingAs($ownerA)
            ->postJson($urlA, [
                'name' => 'Décoration Royale',
                'category' => 'Décoration',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($manager)->getJson($urlA)->assertOk();
        $this->actingAs($manager)
            ->putJson("{$urlA}/{$vendorId}", ['status' => 'selected'])
            ->assertOk();
        $this->actingAs($door)->getJson($urlA)->assertForbidden();
        $this->actingAs($ownerA)
            ->putJson(
                $this->vendorsUrl($organizationB, $eventB)."/{$vendorId}",
                ['name' => 'Intrusion'],
            )
            ->assertNotFound();
        $this->assertDatabaseHas('event_vendors', [
            'id' => $vendorId,
            'name' => 'Décoration Royale',
            'status' => 'selected',
        ]);
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(string $name): array
    {
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
            'estimated_guests' => 100,
            'modules' => ['vendors', 'contracts'],
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

    private function vendorsUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/vendors";
    }

    private function contractsUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/vendor-contracts";
    }

    private function installmentsUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/contract-installments";
    }
}
