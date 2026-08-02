<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\EventType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TenantMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_uploads_publishes_reads_and_deletes_event_media(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create(['role' => 'admin', 'is_active' => true, 'status' => 'active']);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Media', 'organization_type' => 'business', 'event_type_id' => $type->id,
            'event_name' => 'Galerie', 'starts_at' => '2027-11-10', 'timezone' => 'Africa/Kinshasa',
            'format' => 'physical', 'venue_name' => '', 'venue_address' => '', 'city' => 'Kinshasa',
            'country_code' => 'CD', 'currency' => 'USD', 'estimated_guests' => 50, 'modules' => ['media', 'gallery'],
        ]);
        $org = $result['organization'];
        $event = $result['event'];
        $url = "/api/organizations/{$org->slug}/events/{$event->slug}/media";
        $photoId = $this->actingAs($owner)->post($url, [
            'file' => UploadedFile::fake()->image('ceremonie.jpg', 800, 600),
            'category' => 'ceremony', 'caption' => 'Entrée des mariés',
        ])->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->actingAs($owner)->putJson("{$url}/{$photoId}", ['action' => 'publish'])
            ->assertOk()->assertJsonPath('data.status', 'published');
        $contentUrl = $this->actingAs($owner)->getJson($url)->assertOk()
            ->assertJsonPath('data.summary.published', 1)->json('data.photos.0.content_url');
        $this->actingAs($owner)->get($contentUrl)->assertOk();
        $this->actingAs($owner)->deleteJson("{$url}/{$photoId}")->assertNoContent();
        $this->assertDatabaseMissing('photos', ['id' => $photoId]);
    }
}
