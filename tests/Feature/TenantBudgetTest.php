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

class TenantBudgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_categories_and_expense_approval_lifecycle(): void
    {
        [$owner, $organization, $event] = $this->createTenant('budget');
        $url = $this->budgetUrl($organization, $event);
        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.planned_minor', 0);

        $categoryId = $this->actingAs($owner)
            ->postJson("{$url}/categories", [
                'name' => 'Réception',
                'color' => '#B98235',
                'planned_minor' => 100000,
            ])
            ->assertCreated()
            ->json('data.id');
        $expenseId = $this->actingAs($owner)
            ->postJson("{$url}/expenses", [
                'title' => 'Acompte salle',
                'vendor_name' => 'Salle Planivo',
                'amount_minor' => 25000,
                'budget_category_id' => $categoryId,
                'status' => 'pending',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.planned_minor', 100000)
            ->assertJsonPath('data.summary.pending_minor', 25000)
            ->assertJsonPath('data.summary.committed_minor', 0);

        $this->actingAs($owner)
            ->putJson("{$url}/expenses/{$expenseId}/approval", [
                'status' => 'approved',
            ])
            ->assertOk();
        $this->actingAs($owner)
            ->getJson($url)
            ->assertJsonPath('data.summary.committed_minor', 25000)
            ->assertJsonPath('data.summary.remaining_minor', 75000);

        $this->actingAs($owner)
            ->putJson("{$url}/expenses/{$expenseId}/approval", [
                'status' => 'paid',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');
        $this->actingAs($owner)
            ->getJson($url)
            ->assertJsonPath('data.summary.paid_minor', 25000);
    }

    public function test_financial_manager_can_manage_budget_but_access_controller_cannot(): void
    {
        [, $organization, $event] = $this->createTenant('finance-role');
        $finance = $this->assignRole($organization, $event, 'financial_manager');
        $door = $this->assignRole($organization, $event, 'access_controller');
        $url = $this->budgetUrl($organization, $event);

        $this->actingAs($finance)->getJson($url)->assertOk();
        $this->actingAs($finance)
            ->postJson("{$url}/categories", [
                'name' => 'Logistique',
                'planned_minor' => 50000,
            ])
            ->assertCreated();
        $this->actingAs($door)->getJson($url)->assertForbidden();
    }

    public function test_budget_resources_cannot_cross_event_boundaries(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('budget-a');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('budget-b');
        $urlA = $this->budgetUrl($organizationA, $eventA);
        $this->actingAs($ownerA)->getJson($urlA)->assertOk();
        $categoryId = $this->actingAs($ownerA)
            ->postJson("{$urlA}/categories", [
                'name' => 'Privé',
                'planned_minor' => 10000,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($ownerB)
            ->putJson(
                $this->budgetUrl($organizationB, $eventB)."/categories/{$categoryId}",
                ['planned_minor' => 1],
            )
            ->assertNotFound();
        $this->assertDatabaseHas('budget_categories', [
            'id' => $categoryId,
            'planned_minor' => 10000,
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
            'modules' => ['budget'],
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

    private function budgetUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/budget";
    }
}
