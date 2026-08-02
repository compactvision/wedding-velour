<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
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

class TenantCommunicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_publishes_targeted_communication_to_guest_invitations(): void
    {
        [$owner, $organization, $event] = $this->createTenant('annonces');
        $confirmed = $this->createGuest($organization, $event, [
            'first_name' => 'Confirmé',
            'status' => 'confirmed',
        ]);
        $pending = $this->createGuest($organization, $event, [
            'first_name' => 'En attente',
            'status' => 'invited',
        ]);
        $this->createGuest($organization, $event, [
            'first_name' => 'Absent',
            'status' => 'declined',
        ]);
        $url = $this->communicationUrl($organization, $event);

        $createResponse = $this->actingAs($owner)->postJson($url, [
            'title' => 'Programme actualisé',
            'message' => 'Le début de la cérémonie est avancé à 15 h.',
            'type' => 'schedule',
            'audience' => 'all_guests',
            'action_url' => '/timeline',
        ]);
        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.delivery_status', 'draft')
            ->assertJsonPath('data.scope', 'campaign');
        $communicationId = $createResponse->json('data.id');

        $this->getJson("/api/public/invitations/{$confirmed->invitation_link}")
            ->assertOk()
            ->assertJsonCount(0, 'announcements');

        $this->actingAs($owner)
            ->postJson("{$url}/{$communicationId}/publish")
            ->assertOk()
            ->assertJsonPath('data.delivery_status', 'sent')
            ->assertJsonPath('data.recipient_count', 2);

        $this->getJson("/api/public/invitations/{$confirmed->invitation_link}")
            ->assertOk()
            ->assertJsonCount(1, 'announcements')
            ->assertJsonPath('announcements.0.title', 'Programme actualisé');
        $this->getJson("/api/public/invitations/{$pending->invitation_link}")
            ->assertOk()
            ->assertJsonCount(1, 'announcements');

        $this->actingAs($owner)
            ->putJson("{$url}/{$communicationId}", ['title' => 'Altération'])
            ->assertUnprocessable();
    }

    public function test_due_scheduled_communications_are_dispatched_automatically(): void
    {
        [, $organization, $event] = $this->createTenant('planification');
        $this->createGuest($organization, $event, ['status' => 'invited']);
        $communication = WeddingNotificationModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'title' => 'Rappel RSVP',
            'message' => 'Merci de confirmer votre présence.',
            'type' => 'rsvp',
            'scope' => 'campaign',
            'audience' => 'pending_rsvp',
            'target_role' => 'pending_rsvp',
            'channel' => 'in_app',
            'delivery_status' => 'scheduled',
            'scheduled_at' => now()->subMinute(),
            'is_read' => true,
        ]);

        $this->artisan('communications:dispatch')
            ->expectsOutput('1 communication(s) publiée(s).')
            ->assertSuccessful();

        $communication->refresh();
        $this->assertSame('sent', $communication->delivery_status);
        $this->assertSame(1, $communication->recipient_count);
        $this->assertNotNull($communication->sent_at);
    }

    public function test_viewer_reads_activity_but_cannot_create_communications(): void
    {
        [, $organization, $event] = $this->createTenant('communication-lecture');
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
            'name' => 'Lecture communications',
            'slug' => 'communication_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()
                ->whereIn('key', ['event.view', 'notifications.view'])
                ->pluck('id'),
        );
        $eventMember->roles()->attach($role);
        $url = $this->communicationUrl($organization, $event);

        $this->actingAs($member)->getJson($url)->assertOk();
        $this->actingAs($member)->postJson($url, [
            'title' => 'Interdit',
            'message' => 'Ce message ne doit pas être créé.',
            'type' => 'info',
            'audience' => 'all_guests',
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
            'starts_at' => '2027-10-10',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 250,
            'modules' => ['invitations'],
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
            'invitation_link' => (string) Str::uuid(),
            ...$overrides,
        ]);
    }

    private function communicationUrl(
        Organization $organization,
        Event $event,
    ): string {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/communications";
    }
}
