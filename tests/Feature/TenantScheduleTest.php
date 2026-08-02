<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
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

class TenantScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_manages_multiday_schedule_and_public_visibility(): void
    {
        [$owner, $organization, $event] = $this->createTenant('programme');
        $guest = $this->createGuest($organization, $event);
        $url = $this->scheduleUrl($organization, $event);

        $publicResponse = $this->actingAs($owner)->postJson("{$url}/items", [
            'title' => 'Accueil',
            'description' => 'Ouverture des portes',
            'starts_at' => '2027-09-20T08:30:00+01:00',
            'ends_at' => '2027-09-20T09:15:00+01:00',
            'category' => 'reception',
            'location' => 'Hall principal',
            'responsible_name' => 'Équipe accueil',
            'visibility' => 'public',
            'notify_all' => true,
            'sub_details' => ['Badges', 'Orientation'],
        ]);
        $publicResponse
            ->assertCreated()
            ->assertJsonPath('data.title', 'Accueil')
            ->assertJsonPath('data.time', '08:30')
            ->assertJsonPath('data.location', 'Hall principal');
        $publicId = $publicResponse->json('data.id');
        $this->assertNull(
            TimelineEventModel::query()->findOrFail($publicId)->wedding_id,
        );

        $internalResponse = $this->actingAs($owner)->postJson("{$url}/items", [
            'title' => 'Brief technique',
            'starts_at' => '2027-09-21T07:00:00+01:00',
            'category' => 'logistics',
            'visibility' => 'internal',
        ])->assertCreated();

        $this->actingAs($owner)
            ->putJson("{$url}/items/{$publicId}", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->actingAs($owner)
            ->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.total', 2)
            ->assertJsonPath('data.summary.in_progress', 1)
            ->assertJsonPath('data.summary.public', 1)
            ->assertJsonPath('data.items.1.id', $internalResponse->json('data.id'));

        $this->getJson("/api/public/invitations/{$guest->invitation_link}")
            ->assertOk()
            ->assertJsonCount(1, 'timeline')
            ->assertJsonPath('timeline.0.id', $publicId);
    }

    public function test_schedule_validation_and_tenant_boundaries_are_enforced(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('agenda-alpha');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('agenda-beta');
        $item = $this->createItem($organizationA, $eventA);

        $this->actingAs($ownerA)
            ->postJson($this->scheduleUrl($organizationA, $eventA).'/items', [
                'title' => 'Horaire invalide',
                'starts_at' => '2027-09-20T10:00:00+02:00',
                'ends_at' => '2027-09-20T09:00:00+02:00',
                'category' => 'session',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ends_at');

        $this->actingAs($ownerB)
            ->putJson(
                $this->scheduleUrl($organizationB, $eventB)."/items/{$item->id}",
                ['status' => 'completed'],
            )
            ->assertNotFound();
        $this->assertSame('upcoming', $item->fresh()->status);
    }

    public function test_schedule_viewer_cannot_mutate_items(): void
    {
        [, $organization, $event] = $this->createTenant('agenda-lecture');
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
            'name' => 'Lecture programme',
            'slug' => 'schedule_reader',
            'scope' => 'event',
        ]);
        $role->permissions()->attach(
            Permission::query()
                ->whereIn('key', ['event.view', 'schedule.view'])
                ->pluck('id'),
        );
        $eventMember->roles()->attach($role);
        $url = $this->scheduleUrl($organization, $event);

        $this->actingAs($member)->getJson($url)->assertOk();
        $this->actingAs($member)->postJson("{$url}/items", [
            'title' => 'Interdit',
            'starts_at' => '2027-09-20T08:00:00+02:00',
            'category' => 'other',
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
            'starts_at' => '2027-09-20',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 300,
            'modules' => ['invitations'],
        ]);

        return [$user, $result['organization'], $result['event']];
    }

    private function createGuest(
        Organization $organization,
        Event $event,
    ): GuestModel {
        return GuestModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'first_name' => 'Invité',
            'last_name' => 'Programme',
            'status' => 'confirmed',
            'role' => 'guest',
            'companions' => 0,
            'invitation_link' => (string) Str::uuid(),
        ]);
    }

    private function createItem(
        Organization $organization,
        Event $event,
    ): TimelineEventModel {
        return TimelineEventModel::query()->create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => null,
            'title' => 'Session',
            'time' => '10:00',
            'starts_at' => '2027-09-20 08:00:00',
            'category' => 'session',
            'status' => 'upcoming',
            'visibility' => 'public',
        ]);
    }

    private function scheduleUrl(
        Organization $organization,
        Event $event,
    ): string {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/schedule";
    }
}
