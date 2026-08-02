<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Models\CheckIn;
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

class TenantAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_scans_and_checks_in_a_confirmed_party_idempotently(): void
    {
        [$owner, $organization, $event] = $this->createTenant('acces-owner');
        $guest = $this->createGuest($organization, $event, [
            'companions' => 2,
            'qr_code' => 'QR-PLANIVO-001',
        ]);
        $url = $this->accessUrl($organization, $event);

        $this->actingAs($owner)
            ->postJson("{$url}/lookup", [
                'token' => 'https://planivo.test/invitation?invite='.$guest->invitation_link,
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $guest->id)
            ->assertJsonPath('data.checked_in', false);

        $response = $this->actingAs($owner)->postJson("{$url}/check-ins", [
            'guest_id' => $guest->id,
            'method' => 'qr',
        ]);
        $response
            ->assertCreated()
            ->assertJsonPath('data.party_size', 3)
            ->assertJsonPath('meta.already_present', false);

        $this->actingAs($owner)
            ->postJson("{$url}/check-ins", [
                'guest_id' => $guest->id,
                'method' => 'qr',
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $response->json('data.id'))
            ->assertJsonPath('meta.already_present', true);

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.confirmed_people', 3)
            ->assertJsonPath('data.summary.checked_in_people', 3)
            ->assertJsonPath('data.summary.remaining_people', 0)
            ->assertJsonPath('data.guests.0.status', 'confirmed')
            ->assertJsonPath('data.guests.0.checked_in', true);

        $this->assertDatabaseCount('check_ins', 1);
        $this->assertDatabaseHas('wedding_notifications', [
            'event_id' => $event->id,
            'title' => 'Arrivée enregistrée',
        ]);
    }

    public function test_unconfirmed_and_cross_event_credentials_are_rejected(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('acces-a');
        [, $organizationB, $eventB] = $this->createTenant('acces-b');
        $pending = $this->createGuest($organizationA, $eventA, [
            'status' => 'invited',
        ]);
        $foreign = $this->createGuest($organizationB, $eventB);
        $url = $this->accessUrl($organizationA, $eventA);

        $this->actingAs($ownerA)
            ->postJson("{$url}/lookup", ['token' => $foreign->invitation_link])
            ->assertNotFound();
        $this->actingAs($ownerA)
            ->postJson("{$url}/check-ins", [
                'guest_id' => $pending->id,
                'method' => 'manual',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('guest_id');

        $this->assertDatabaseCount('check_ins', 0);
    }

    public function test_access_controller_can_scan_but_only_manager_can_revoke(): void
    {
        [$owner, $organization, $event] = $this->createTenant('acces-role');
        $guest = $this->createGuest($organization, $event);
        $controller = $this->assignAccessController($organization, $event);
        $url = $this->accessUrl($organization, $event);

        $checkInId = $this->actingAs($controller)
            ->postJson("{$url}/check-ins", [
                'guest_id' => $guest->id,
                'method' => 'manual',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($controller)
            ->deleteJson("{$url}/check-ins/{$checkInId}")
            ->assertForbidden();
        $this->actingAs($owner)
            ->deleteJson("{$url}/check-ins/{$checkInId}")
            ->assertNoContent();

        $this->assertNotNull(CheckIn::query()->findOrFail($checkInId)->revoked_at);
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
            'modules' => ['qr_access'],
        ]);

        return [$user, $result['organization'], $result['event']];
    }

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
            'qr_code' => (string) Str::uuid(),
            'invitation_link' => (string) Str::uuid(),
            ...$overrides,
        ]);
    }

    private function assignAccessController(
        Organization $organization,
        Event $event,
    ): User {
        $user = User::factory()->create([
            'role' => 'door',
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
                ->where('slug', 'access_controller')
                ->firstOrFail(),
        );

        return $user;
    }

    private function accessUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/access";
    }
}
