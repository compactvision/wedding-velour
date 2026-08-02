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

class TenantInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_stock_without_allowing_negative_quantities(): void
    {
        [$owner, $organization, $event] = $this->createTenant('inventory');
        $url = $this->inventoryUrl($organization, $event);
        $itemId = $this->actingAs($owner)
            ->postJson("{$url}/items", [
                'name' => 'Bouteilles d’eau',
                'sku' => 'EAU-50',
                'category' => 'Boissons',
                'unit' => 'carton',
                'reorder_level' => 5,
                'unit_cost_minor' => 1200,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($owner)
            ->postJson("{$url}/items/{$itemId}/movements", [
                'type' => 'receipt',
                'quantity' => 20,
                'reason' => 'Stock initial',
            ])
            ->assertCreated()
            ->assertJsonPath('data.quantity_after', '20.000');
        $this->actingAs($owner)
            ->postJson("{$url}/items/{$itemId}/movements", [
                'type' => 'issue',
                'quantity' => 7,
                'reason' => 'Mise en place',
            ])
            ->assertCreated()
            ->assertJsonPath('data.quantity_after', '13.000');
        $this->actingAs($owner)
            ->postJson("{$url}/items/{$itemId}/movements", [
                'type' => 'issue',
                'quantity' => 14,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.item_count', 1)
            ->assertJsonPath('data.summary.stock_value_minor', 15600);
        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'current_quantity' => 13,
        ]);
    }

    public function test_purchase_order_approval_and_receipt_updates_stock_once(): void
    {
        [$owner, $organization, $event] = $this->createTenant('purchasing');
        $url = $this->inventoryUrl($organization, $event);
        $itemId = $this->actingAs($owner)
            ->postJson("{$url}/items", [
                'name' => 'Nappes',
                'unit' => 'pièce',
                'reorder_level' => 10,
            ])
            ->assertCreated()
            ->json('data.id');
        $supplierId = $this->actingAs($owner)
            ->postJson("{$url}/suppliers", [
                'name' => 'Décor Kin',
                'email' => 'achats@decor.test',
            ])
            ->assertCreated()
            ->json('data.id');
        $orderId = $this->actingAs($owner)
            ->postJson("{$url}/purchase-orders", [
                'supplier_id' => $supplierId,
                'items' => [[
                    'inventory_item_id' => $itemId,
                    'quantity' => 25,
                    'unit_cost_minor' => 450,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_minor', 11250)
            ->json('data.id');

        foreach (['submit', 'approve', 'receive'] as $action) {
            $this->actingAs($owner)
                ->putJson("{$url}/purchase-orders/{$orderId}/transition", compact('action'))
                ->assertOk();
        }
        $this->actingAs($owner)
            ->putJson("{$url}/purchase-orders/{$orderId}/transition", ['action' => 'receive'])
            ->assertOk()
            ->assertJsonPath('data.status', 'received');

        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'current_quantity' => 25,
            'unit_cost_minor' => 450,
        ]);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_permissions_and_event_boundaries_are_enforced(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('stock-a');
        [, $organizationB, $eventB] = $this->createTenant('stock-b');
        $logistics = $this->assignRole($organizationA, $eventA, 'logistics_manager');
        $door = $this->assignRole($organizationA, $eventA, 'access_controller');
        $urlA = $this->inventoryUrl($organizationA, $eventA);
        $itemId = $this->actingAs($ownerA)
            ->postJson("{$urlA}/items", ['name' => 'Chaises'])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($logistics)->getJson($urlA)->assertOk();
        $this->actingAs($logistics)
            ->postJson("{$urlA}/items/{$itemId}/movements", [
                'type' => 'receipt',
                'quantity' => 100,
            ])
            ->assertCreated();
        $this->actingAs($door)->getJson($urlA)->assertForbidden();
        $this->actingAs($ownerA)
            ->putJson(
                $this->inventoryUrl($organizationB, $eventB)."/items/{$itemId}",
                ['name' => 'Intrusion'],
            )
            ->assertNotFound();
        $this->assertDatabaseHas('inventory_items', [
            'id' => $itemId,
            'name' => 'Chaises',
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
            'modules' => ['stock', 'purchasing'],
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

    private function inventoryUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/inventory";
    }
}
