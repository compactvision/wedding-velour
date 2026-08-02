<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
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

class TenantInvitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_customizes_invitation_and_reads_rsvp_summary(): void
    {
        [$owner, $organization, $event] = $this->createTenant('atelier-soleil');
        $wedding = WeddingModel::query()->create([
            'id' => (string) Str::uuid(),
            'title' => 'Ancien titre',
            'date' => '2027-06-12',
            'venue' => 'Jardin Planivo',
            'status' => 'planning',
            'max_guests' => 200,
        ]);
        $event->update(['legacy_wedding_id' => $wedding->id]);

        $confirmed = $this->createGuest($organization, $event, [
            'wedding_id' => $wedding->id,
            'first_name' => 'Lina',
            'status' => 'confirmed',
            'companions' => 2,
        ]);
        $this->createGuest($organization, $event, [
            'wedding_id' => $wedding->id,
            'first_name' => 'Marc',
            'status' => 'declined',
        ]);
        $this->createGuest($organization, $event, [
            'wedding_id' => $wedding->id,
            'first_name' => 'Zoé',
            'status' => 'invited',
        ]);

        $url = $this->invitationUrl($organization, $event);
        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.configuration.title', $event->name)
            ->assertJsonPath('data.rsvp_summary.guests', 3)
            ->assertJsonPath('data.rsvp_summary.confirmed_people', 3)
            ->assertJsonPath('data.rsvp_summary.declined_guests', 1)
            ->assertJsonPath('data.rsvp_summary.pending_guests', 1);

        $configuration = [
            'eyebrow' => 'Une journée à partager',
            'title' => 'La fête du Soleil',
            'greeting' => 'Bonjour {guest}',
            'body' => 'Nous avons hâte de vous retrouver.',
            'rsvp_question' => 'Pouvez-vous être des nôtres ?',
            'accept_label' => 'Je participe',
            'decline_label' => 'Je ne serai pas disponible',
            'footer' => 'À bientôt',
            'background_image' => '/storage/uploads/soleil.jpg',
            'accent_color' => '#C47A32',
            'rsvp_deadline' => '2027-06-01',
            'show_event_details' => true,
        ];

        $this->actingAs($owner)
            ->putJson($url, $configuration)
            ->assertOk()
            ->assertJsonPath('data.configuration.title', 'La fête du Soleil')
            ->assertJsonPath('data.configuration.accent_color', '#C47A32');

        $this->assertSame(
            'La fête du Soleil',
            $event->settings()->firstOrFail()->public_page['invitation']['title'],
        );
        $this->assertSame(
            'La fête du Soleil',
            $wedding->fresh()->invitation_custom['title'],
        );

        $this->getJson("/api/public/invitations/{$confirmed->invitation_link}")
            ->assertOk()
            ->assertJsonPath('wedding.invitation_custom.title', 'La fête du Soleil')
            ->assertJsonPath('wedding.invitation_custom.rsvp_question', 'Pouvez-vous être des nôtres ?');
    }

    public function test_wedding_receives_only_wedding_invitation_content_suggestions(): void
    {
        [$owner, $organization, $event] = $this->createTenant('mariage-modele', 'wedding');

        $this->actingAs($owner)
            ->getJson($this->invitationUrl($organization, $event))
            ->assertOk()
            ->assertJsonPath('data.event_type', 'Mariage')
            ->assertJsonCount(3, 'data.templates')
            ->assertJsonPath('data.templates.0.slug', 'elegant')
            ->assertJsonPath('data.templates.0.is_default', true)
            ->assertJsonPath('data.templates.0.configuration.title', $event->name)
            ->assertJsonPath(
                'data.templates.0.configuration.rsvp_question',
                'Serez-vous à nos côtés pour célébrer notre mariage ?',
            );
    }

    public function test_expired_rsvp_is_rejected_without_changing_guest(): void
    {
        [$owner, $organization, $event] = $this->createTenant('deadline');
        $guest = $this->createGuest($organization, $event, [
            'first_name' => 'Réponse',
            'status' => 'invited',
        ]);
        $configuration = $this->actingAs($owner)
            ->getJson($this->invitationUrl($organization, $event))
            ->json('data.configuration');
        $configuration['rsvp_deadline'] = '2000-01-01';

        $this->actingAs($owner)
            ->putJson($this->invitationUrl($organization, $event), $configuration)
            ->assertOk();

        $this->putJson("/api/public/invitations/{$guest->invitation_link}", [
            'status' => 'confirmed',
            'menu_preferences' => [],
        ])->assertUnprocessable();

        $this->assertSame('invited', $guest->fresh()->status);
    }

    public function test_member_can_view_but_cannot_update_invitation(): void
    {
        [, $organization, $event] = $this->createTenant('droits');
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
            'name' => 'Lecture invitations',
            'slug' => 'invitation_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()
                ->whereIn('key', ['event.view', 'invitations.view'])
                ->pluck('id'),
        );
        $eventMember->roles()->attach($role);

        $url = $this->invitationUrl($organization, $event);
        $configuration = $this->actingAs($member)
            ->getJson($url)
            ->assertOk()
            ->json('data.configuration');

        $this->actingAs($member)
            ->putJson($url, $configuration)
            ->assertForbidden();
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(string $name, string $eventTypeSlug = 'birthday'): array
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
            'locale' => 'fr',
            'timezone' => 'Africa/Kinshasa',
        ]);
        app(FoundationCatalogService::class)->seed();
        $eventType = EventType::query()->where('slug', $eventTypeSlug)->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($user, [
            'organization_name' => $name,
            'organization_type' => 'personal',
            'event_type_id' => $eventType->id,
            'event_name' => "Événement {$name}",
            'starts_at' => '2027-06-12',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Maison Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 120,
            'modules' => ['invitations', 'rsvps'],
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
            'status' => 'invited',
            'role' => 'guest',
            'companions' => 0,
            'invitation_link' => (string) Str::uuid(),
            'qr_code' => (string) Str::uuid(),
            ...$overrides,
        ]);
    }

    private function invitationUrl(
        Organization $organization,
        Event $event,
    ): string {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/invitation";
    }
}
