<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\EventType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_creates_a_template_issues_an_idempotent_badge_and_revokes_it(): void
    {
        $owner = User::factory()->create(['role' => 'admin', 'is_active' => true, 'status' => 'active']);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Planivo Badges',
            'organization_type' => 'business',
            'event_type_id' => $type->id,
            'event_name' => 'Sommet Planivo',
            'starts_at' => '2027-11-10',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => '',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 100,
            'modules' => ['guests', 'badges'],
        ]);
        $organization = $result['organization'];
        $event = $result['event'];
        $eventUrl = "/api/organizations/{$organization->slug}/events/{$event->slug}";

        $guestId = $this->actingAs($owner)->postJson("{$eventUrl}/guests", [
            'first_name' => 'Amina',
            'last_name' => 'Kalala',
            'role' => 'vip',
            'status' => 'confirmed',
        ])->assertCreated()->json('data.id');

        $badgeUrl = "{$eventUrl}/badges";
        $templateId = $this->actingAs($owner)->postJson("{$badgeUrl}/templates", [
            'name' => 'Accueil VIP',
            'format' => 'portrait',
            'primary_color' => '#7C3AED',
            'show_qr' => true,
            'show_organization' => true,
        ])->assertCreated()
            ->assertJsonPath('data.primary_color', '#7C3AED')
            ->json('data.id');

        $payload = [
            'source_type' => 'guest',
            'source_id' => $guestId,
            'badge_template_id' => $templateId,
            'holder_role' => 'Invitée VIP',
        ];
        $badgeId = $this->actingAs($owner)->postJson("{$badgeUrl}/issue", $payload)
            ->assertCreated()
            ->assertJsonPath('data.holder_name', 'Amina Kalala')
            ->assertJsonPath('data.status', 'issued')
            ->json('data.id');

        $this->actingAs($owner)->postJson("{$badgeUrl}/issue", $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', $badgeId);
        $this->assertDatabaseCount('badges', 1);

        $this->actingAs($owner)->putJson("{$badgeUrl}/{$badgeId}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', 'revoked');
        $this->actingAs($owner)->putJson("{$badgeUrl}/{$badgeId}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', 'revoked');

        $this->actingAs($owner)->getJson($badgeUrl)
            ->assertOk()
            ->assertJsonPath('data.summary.total', 1)
            ->assertJsonPath('data.summary.issued', 0)
            ->assertJsonPath('data.summary.revoked', 1)
            ->assertJsonPath('data.candidates.guests.0.name', 'Amina Kalala');
    }
}
