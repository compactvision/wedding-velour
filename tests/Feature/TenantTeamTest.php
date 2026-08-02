<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\OrganizationMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantTeamTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_invites_a_collaborator_who_accepts_an_event_role(): void
    {
        [$owner, $organization, $event] = $this->createTenant('equipe');
        $collaborator = User::factory()->create([
            'email' => 'agent@planivo.test',
            'role' => 'door',
            'is_active' => true,
            'status' => 'active',
        ]);
        $url = $this->teamUrl($organization, $event);

        $response = $this->actingAs($owner)->postJson("{$url}/invitations", [
            'email' => 'agent@planivo.test',
            'role_slug' => 'access_controller',
        ]);
        $response
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.role_slug', 'access_controller');
        $token = basename(parse_url($response->json('data.invitation_url'), PHP_URL_PATH));

        $this->actingAs($collaborator)
            ->post("/team/invitations/{$token}")
            ->assertRedirect(route('workspace'));

        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $collaborator->id)
            ->firstOrFail();
        $eventMember = EventMember::query()
            ->where('event_id', $event->id)
            ->where('organization_member_id', $member->id)
            ->with('roles')
            ->firstOrFail();
        $this->assertSame('access_controller', $eventMember->roles->first()->slug);
        $this->assertDatabaseHas('organization_invitations', [
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'status' => 'accepted',
            'accepted_by_user_id' => $collaborator->id,
        ]);

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonFragment([
                'email' => 'agent@planivo.test',
                'status' => 'active',
            ]);
    }

    public function test_invitation_cannot_be_accepted_by_another_identity(): void
    {
        [$owner, $organization, $event] = $this->createTenant('identite');
        $other = User::factory()->create([
            'email' => 'autre@planivo.test',
            'is_active' => true,
            'status' => 'active',
        ]);
        $response = $this->actingAs($owner)
            ->postJson($this->teamUrl($organization, $event).'/invitations', [
                'email' => 'destinataire@planivo.test',
                'role_slug' => 'event_organizer',
            ]);
        $token = basename(parse_url($response->json('data.invitation_url'), PHP_URL_PATH));

        $this->actingAs($other)
            ->post("/team/invitations/{$token}")
            ->assertSessionHasErrors('invitation');

        $this->assertSame(
            'pending',
            OrganizationInvitation::query()->firstOrFail()->status,
        );
        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $other->id,
        ]);
    }

    public function test_event_role_cannot_manage_team_or_cross_tenant_boundaries(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('alpha-team');
        [, $organizationB, $eventB] = $this->createTenant('beta-team');
        $controller = $this->assignRole($organizationA, $eventA, 'access_controller');

        $this->actingAs($controller)
            ->getJson($this->teamUrl($organizationA, $eventA))
            ->assertForbidden();
        $this->actingAs($ownerA)
            ->getJson($this->teamUrl($organizationB, $eventB))
            ->assertForbidden();
    }

    public function test_owner_can_change_a_member_role_and_suspend_event_access(): void
    {
        [$owner, $organization, $event] = $this->createTenant('roles-team');
        $memberUser = $this->assignRole($organization, $event, 'access_controller');
        $member = OrganizationMember::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $memberUser->id)
            ->firstOrFail();
        $url = $this->teamUrl($organization, $event)."/members/{$member->id}";

        $this->actingAs($owner)
            ->putJson($url, [
                'role_slug' => 'catering_operator',
                'status' => 'suspended',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended')
            ->assertJsonPath('data.roles.0.slug', 'catering_operator');

        $this->actingAs($memberUser)
            ->getJson($this->teamUrl($organization, $event))
            ->assertForbidden();
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
            'estimated_guests' => 250,
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

    private function teamUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/team";
    }
}
