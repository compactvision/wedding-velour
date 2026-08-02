<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantCateringTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_native_menu_and_reads_table_preparation_summary(): void
    {
        [$owner, $organization, $event] = $this->createTenant('traiteur');
        $url = $this->cateringUrl($organization, $event);
        $createResponse = $this->actingAs($owner)->postJson("{$url}/items", [
            'name' => 'Poulet aux herbes',
            'emoji' => '🍗',
            'category' => 'main',
            'description' => 'Servi avec légumes.',
            'available_quantity' => 120,
            'is_available' => true,
            'allergens' => ['lait'],
            'dietary_tags' => ['Sans gluten'],
            'unit_price' => 18.5,
            'service_period' => 'main_service',
        ]);
        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Poulet aux herbes')
            ->assertJsonPath('data.remaining_quantity', 120)
            ->assertJsonPath('data.event_id', $event->id);
        $menuItemId = $createResponse->json('data.id');
        $this->assertNull(
            MenuItemModel::query()->findOrFail($menuItemId)->wedding_id,
        );

        $table = $this->createTable($organization, $event);
        $guest = $this->createGuest($organization, $event, [
            'table_id' => $table->id,
            'companions' => 2,
            'dietary_restrictions' => 'Sans arachides',
            'menu_preferences' => [$menuItemId],
        ]);

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.confirmed_people', 3)
            ->assertJsonPath('data.summary.preference_selections', 1)
            ->assertJsonPath('data.summary.dietary_alerts', 1)
            ->assertJsonPath('data.menu_items.0.preference_count', 1)
            ->assertJsonPath('data.table_needs.0.table_name', 'Table Horizon')
            ->assertJsonPath('data.table_needs.0.people', 3)
            ->assertJsonPath(
                'data.table_needs.0.preferences.Poulet aux herbes',
                1,
            );

        $this->postJson("/api/public/invitations/{$guest->invitation_link}/orders", [
            'type' => 'food',
            'description' => 'Poulet aux herbes',
            'menu_item_id' => $menuItemId,
            'quantity' => 2,
        ])
            ->assertCreated()
            ->assertJsonPath('event_id', $event->id)
            ->assertJsonPath('quantity', 2);

        $this->actingAs($owner)
            ->deleteJson("{$url}/items/{$menuItemId}")
            ->assertNoContent();
        $this->assertSame([], $guest->fresh()->menu_preferences);
    }

    public function test_menu_items_cannot_cross_event_boundaries(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('cuisine-alpha');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('cuisine-beta');
        $item = $this->createMenuItem($organizationA, $eventA);

        $this->actingAs($ownerB)
            ->putJson(
                $this->cateringUrl($organizationB, $eventB)."/items/{$item->id}",
                ['name' => 'Intrusion'],
            )
            ->assertNotFound();
        $this->assertSame('Menu Planivo', $item->fresh()->name);

        $this->actingAs($ownerA)
            ->putJson(
                $this->cateringUrl($organizationA, $eventA)."/items/{$item->id}",
                ['available_quantity' => 5],
            )
            ->assertOk()
            ->assertJsonPath('data.remaining_quantity', 5);
    }

    public function test_catering_viewer_cannot_manage_menu(): void
    {
        [, $organization, $event] = $this->createTenant('cuisine-lecture');
        $member = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);
        $organizationMember = OrganizationMember::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'user_id' => $member->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $eventMember = EventMember::query()->create([
            'id' => (string) Str::uuid(),
            'event_id' => $event->id,
            'organization_member_id' => $organizationMember->id,
            'status' => 'active',
            'assigned_at' => now(),
        ]);
        $role = Role::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'name' => 'Lecture restauration',
            'slug' => 'catering_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()
                ->whereIn('key', ['event.view', 'catering.view'])
                ->pluck('id'),
        );
        $eventMember->roles()->attach($role);
        $url = $this->cateringUrl($organization, $event);

        $this->actingAs($member)->getJson($url)->assertOk();
        $this->actingAs($member)->postJson("{$url}/items", [
            'name' => 'Interdit',
            'category' => 'food',
        ])->assertForbidden();
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(string $name): array
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
            'locale' => 'fr',
            'timezone' => 'Africa/Kinshasa',
        ]);
        app(FoundationCatalogService::class)->seed();
        $eventType = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($user, [
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
            'estimated_guests' => 250,
            'modules' => ['catering'],
        ]);

        return [$user, $result['organization'], $result['event']];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createGuest(
        Organization $organization,
        Event $event,
        array $overrides = [],
    ): GuestModel {
        return GuestModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'first_name' => 'Invité',
            'last_name' => 'Planivo',
            'status' => 'confirmed',
            'role' => 'guest',
            'companions' => 0,
            'menu_preferences' => [],
            'invitation_link' => (string) Str::uuid(),
            ...$overrides,
        ]);
    }

    private function createTable(
        Organization $organization,
        Event $event,
    ): WeddingTableModel {
        return WeddingTableModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'name' => 'Table Horizon',
            'capacity' => 8,
            'shape' => 'round',
            'category' => 'other',
        ]);
    }

    private function createMenuItem(
        Organization $organization,
        Event $event,
    ): MenuItemModel {
        return MenuItemModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'name' => 'Menu Planivo',
            'category' => 'food',
            'available_quantity' => 0,
            'remaining_quantity' => 0,
            'is_available' => true,
            'service_period' => 'main_service',
        ]);
    }

    private function cateringUrl(
        Organization $organization,
        Event $event,
    ): string {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/catering";
    }
}
