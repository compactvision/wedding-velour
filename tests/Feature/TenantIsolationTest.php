<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventCategory;
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

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_only_lists_and_reads_events_from_their_organization(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('alpha');
        [, $organizationB, $eventB] = $this->createTenant('beta');

        $this->actingAs($ownerA)
            ->getJson('/api/organizations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $organizationA->id);

        $this->actingAs($ownerA)
            ->getJson("/api/organizations/{$organizationA->slug}/events")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eventA->id);

        $this->actingAs($ownerA)
            ->getJson("/api/organizations/{$organizationB->slug}/events")
            ->assertForbidden();

        $this->actingAs($ownerA)
            ->getJson("/api/organizations/{$organizationA->slug}/events/{$eventB->slug}")
            ->assertNotFound();
    }

    public function test_event_member_cannot_read_an_event_from_another_tenant(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('alpha');
        [, $organizationB, $eventB] = $this->createTenant('beta');
        $member = User::factory()->create([
            'role' => 'manager',
            'is_active' => true,
            'status' => 'active',
        ]);

        $organizationMember = OrganizationMember::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationA->id,
            'user_id' => $member->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $eventMember = EventMember::query()->create([
            'id' => (string) Str::uuid(),
            'event_id' => $eventA->id,
            'organization_member_id' => $organizationMember->id,
            'status' => 'active',
            'assigned_at' => now(),
        ]);
        $permission = Permission::query()->create([
            'key' => 'event.view',
            'module_slug' => 'event',
        ]);
        $role = Role::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationA->id,
            'name' => 'Lecteur événement',
            'slug' => 'event_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach($permission);
        $eventMember->roles()->attach($role);

        $this->actingAs($member)
            ->getJson("/api/organizations/{$organizationA->slug}/events")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $eventA->id);

        $this->actingAs($member)
            ->getJson("/api/organizations/{$organizationA->slug}/events/{$eventA->slug}")
            ->assertOk()
            ->assertJsonPath('data.id', $eventA->id);

        $this->actingAs($member)
            ->getJson("/api/organizations/{$organizationB->slug}/events/{$eventB->slug}")
            ->assertForbidden();

        $this->actingAs($ownerA)
            ->getJson("/api/organizations/{$organizationB->slug}/events/{$eventB->slug}")
            ->assertForbidden();
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(string $slug): array
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $organization = Organization::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'name' => ucfirst($slug),
            'slug' => $slug,
            'status' => 'active',
            'timezone' => 'Africa/Kinshasa',
        ]);
        OrganizationMember::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $category = EventCategory::query()->firstOrCreate(
            ['slug' => 'familial'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Familial',
                'status' => 'active',
            ],
        );
        $eventType = EventType::query()->firstOrCreate(
            ['slug' => 'wedding'],
            [
                'id' => (string) Str::uuid(),
                'event_category_id' => $category->id,
                'name' => 'Mariage',
                'status' => 'active',
            ],
        );
        $event = Event::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_type_id' => $eventType->id,
            'created_by_user_id' => $owner->id,
            'name' => "Événement {$slug}",
            'slug' => "event-{$slug}",
            'status' => 'active',
            'timezone' => 'Africa/Kinshasa',
        ]);

        return [$owner, $organization, $event];
    }
}
