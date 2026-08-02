<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
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

class TenantSeatingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_native_tables_assignments_and_shared_layout(): void
    {
        [$owner, $organization, $event] = $this->createTenant('placement');
        $guest = $this->createGuest($organization, $event, [
            'first_name' => 'Amina',
            'companions' => 2,
        ]);
        $url = $this->seatingUrl($organization, $event);

        $tableResponse = $this->actingAs($owner)->postJson("{$url}/tables", [
            'name' => 'Horizon',
            'capacity' => 6,
            'shape' => 'round',
            'category' => 'vip',
        ]);
        $tableResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Horizon')
            ->assertJsonPath('data.event_id', $event->id);
        $tableId = $tableResponse->json('data.id');
        $this->assertNull(WeddingTableModel::query()->findOrFail($tableId)->wedding_id);

        $this->actingAs($owner)
            ->putJson("{$url}/assignments/{$guest->id}", ['table_id' => $tableId])
            ->assertOk()
            ->assertJsonPath('data.table_id', $tableId);

        $polygon = [
            ['x' => 20, 'y' => 20],
            ['x' => 560, 'y' => 20],
            ['x' => 560, 'y' => 400],
            ['x' => 20, 'y' => 400],
        ];
        $this->actingAs($owner)->putJson("{$url}/layout", [
            'positions' => [['id' => $tableId, 'x' => 180, 'y' => 140]],
            'room_polygon' => $polygon,
        ])->assertOk();

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.tables', 1)
            ->assertJsonPath('data.summary.seated_people', 3)
            ->assertJsonPath('data.tables.0.occupied_seats', 3)
            ->assertJsonPath('data.tables.0.position_x', 180)
            ->assertJsonPath('data.room_polygon.2.y', 400);

        $this->actingAs($owner)
            ->deleteJson("{$url}/tables/{$tableId}")
            ->assertNoContent();
        $this->assertNull($guest->fresh()->table_id);
    }

    public function test_capacity_and_event_boundaries_are_enforced(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('alpha');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('beta');
        $table = $this->createTable($organizationA, $eventA, ['capacity' => 2]);
        $guest = $this->createGuest($organizationA, $eventA, ['companions' => 2]);

        $this->actingAs($ownerA)
            ->putJson(
                $this->seatingUrl($organizationA, $eventA)."/assignments/{$guest->id}",
                ['table_id' => $table->id],
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('table_id');
        $this->assertNull($guest->fresh()->table_id);

        $this->actingAs($ownerB)
            ->putJson(
                $this->seatingUrl($organizationB, $eventB)."/tables/{$table->id}",
                ['name' => 'Intrusion'],
            )
            ->assertNotFound();

        $this->actingAs($ownerA)
            ->putJson(
                $this->seatingUrl($organizationA, $eventA).'/layout',
                [
                    'positions' => [['id' => $table->id, 'x' => 1200, 'y' => 10]],
                    'room_polygon' => [],
                ],
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('positions.0.x');
    }

    public function test_viewer_can_read_but_cannot_change_seating(): void
    {
        [, $organization, $event] = $this->createTenant('lecture');
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
            'name' => 'Lecture placement',
            'slug' => 'seating_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()
                ->whereIn('key', ['event.view', 'seating.view'])
                ->pluck('id'),
        );
        $eventMember->roles()->attach($role);
        $url = $this->seatingUrl($organization, $event);

        $this->actingAs($member)->getJson($url)->assertOk();
        $this->actingAs($member)->postJson("{$url}/tables", [
            'name' => 'Interdite',
            'capacity' => 8,
            'shape' => 'round',
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
        $eventType = EventType::query()->where('slug', 'birthday')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($user, [
            'organization_name' => $name,
            'organization_type' => 'personal',
            'event_type_id' => $eventType->id,
            'event_name' => "Événement {$name}",
            'starts_at' => '2027-08-15',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Espace Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 100,
            'modules' => ['seating'],
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
            ...$overrides,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createTable(
        Organization $organization,
        Event $event,
        array $overrides = [],
    ): WeddingTableModel {
        return WeddingTableModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'name' => 'Table Planivo',
            'capacity' => 8,
            'shape' => 'round',
            'category' => 'other',
            ...$overrides,
        ]);
    }

    private function seatingUrl(
        Organization $organization,
        Event $event,
    ): string {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/seating";
    }
}
