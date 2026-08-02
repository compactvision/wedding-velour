<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
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

class TenantGuestTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_event_native_guests_and_public_rsvp(): void
    {
        [$owner, $organization, $event] = $this->createTenant('studio-lumina');
        $baseUrl = $this->guestUrl($organization, $event);

        $createResponse = $this->actingAs($owner)->postJson($baseUrl, [
            'first_name' => 'Amina',
            'last_name' => 'Kabeya',
            'email' => 'amina@example.test',
            'phone' => '+243810000001',
            'role' => 'vip',
            'companions' => 2,
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.first_name', 'Amina')
            ->assertJsonPath('data.event_id', $event->id);

        $guestId = $createResponse->json('data.id');
        $guest = GuestModel::query()->findOrFail($guestId);
        $this->assertNull($guest->wedding_id);
        $this->assertNotNull($guest->invitation_link);

        $this->actingAs($owner)
            ->getJson($baseUrl.'?search=Amina')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $guestId);

        $this->actingAs($owner)
            ->putJson("{$baseUrl}/{$guestId}", ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');

        $this->getJson("/api/public/invitations/{$guest->invitation_link}")
            ->assertOk()
            ->assertJsonPath('guest.id', $guestId)
            ->assertJsonPath('wedding.title', $event->name);

        $this->putJson("/api/public/invitations/{$guest->invitation_link}", [
            'status' => 'attending',
            'menu_preferences' => [],
        ])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->actingAs($owner)
            ->deleteJson("{$baseUrl}/{$guestId}")
            ->assertNoContent();
        $this->assertDatabaseMissing('guests', ['id' => $guestId]);
    }

    public function test_guest_resource_cannot_cross_event_or_organization_boundaries(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('alpha-events');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('beta-events');
        $guest = GuestModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationA->id,
            'event_id' => $eventA->id,
            'wedding_id' => null,
            'first_name' => 'Privé',
            'last_name' => 'Alpha',
            'status' => 'invited',
            'role' => 'guest',
            'companions' => 0,
        ]);

        $this->actingAs($ownerB)
            ->getJson($this->guestUrl($organizationB, $eventB)."/{$guest->id}")
            ->assertNotFound();

        $this->actingAs($ownerB)
            ->getJson($this->guestUrl($organizationA, $eventA))
            ->assertForbidden();

        $this->actingAs($ownerA)
            ->getJson($this->guestUrl($organizationA, $eventA)."/{$guest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $guest->id);
    }

    public function test_event_member_with_view_permission_cannot_mutate_guests(): void
    {
        [$owner, $organization, $event] = $this->createTenant('lecture-seule');
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
            'name' => 'Lecture invités',
            'slug' => 'guest_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()->whereIn('key', ['event.view', 'guests.view'])->pluck('id'),
        );
        $eventMember->roles()->attach($role);

        $baseUrl = $this->guestUrl($organization, $event);
        $this->actingAs($member)->getJson($baseUrl)->assertOk();
        $this->actingAs($member)->postJson($baseUrl, [
            'first_name' => 'Non',
            'last_name' => 'Autorisé',
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
            'starts_at' => '2027-05-20',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 200,
            'modules' => ['guests'],
        ]);

        return [$user, $result['organization'], $result['event']];
    }

    private function guestUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/guests";
    }
}
