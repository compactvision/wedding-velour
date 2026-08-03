<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\EventType;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_uploads_publishes_reads_and_deletes_event_media(): void
    {
        config()->set('filesystems.media_disk', 'local');
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
        $plan = Plan::query()->where('slug', 'standard')->firstOrFail();
        Subscription::query()->create([
            'organization_id' => $org->id,
            'event_id' => $event->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'provider' => 'test',
            'plan_snapshot' => ['limits' => ['storage_gb' => 10]],
            'active_marker' => true,
        ]);
        $url = "/api/organizations/{$org->slug}/events/{$event->slug}/media";
        $photoId = $this->actingAs($owner)->post($url, [
            'file' => UploadedFile::fake()->image('ceremonie.jpg', 800, 600),
            'category' => 'ceremony', 'caption' => 'Entrée des mariés',
        ])->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->actingAs($owner)->putJson("{$url}/{$photoId}", ['action' => 'publish'])
            ->assertOk()->assertJsonPath('data.status', 'published');
        $contentUrl = $this->actingAs($owner)->getJson($url)->assertOk()
            ->assertJsonPath('data.summary.published', 1)
            ->assertJsonPath('data.summary.limit_bytes', 10 * 1024 * 1024 * 1024)
            ->json('data.photos.0.content_url');
        $this->actingAs($owner)->get($contentUrl)->assertOk();

        $gallery = $this->actingAs($owner)->postJson("{$url}/gallery-link", [
            'allow_downloads' => true,
        ])->assertCreated()->json('data');
        $this->get($gallery['share_url'])
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PublicGallery')
                ->where('gallery.event_name', 'Galerie')
                ->where('gallery.allow_downloads', true)
                ->has('media', 1));
        $token = basename($gallery['share_url']);
        $this->get("/gallery/{$token}/media/{$photoId}")->assertOk();
        $this->get("/gallery/{$token}/media/{$photoId}/download")
            ->assertOk()
            ->assertDownload('ceremonie.jpg');
        $this->actingAs($owner)->postJson("{$url}/gallery-link", [
            'allow_downloads' => false,
        ])->assertOk();
        $this->get("/gallery/{$token}/media/{$photoId}/download")->assertForbidden();
        $newGallery = $this->actingAs($owner)->postJson("{$url}/gallery-link", [
            'regenerate' => true,
        ])->assertOk()->json('data');
        $this->get($gallery['share_url'])->assertNotFound();
        $this->get($newGallery['share_url'])->assertOk();

        $this->actingAs($owner)->deleteJson("{$url}/{$photoId}")->assertNoContent();
        $this->assertDatabaseMissing('photos', ['id' => $photoId]);
    }

    public function test_media_upload_requires_storage_from_an_active_pack(): void
    {
        config()->set('filesystems.media_disk', 'local');
        Storage::fake('local');
        $owner = User::factory()->create(['role' => 'admin', 'is_active' => true, 'status' => 'active']);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'wedding')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Mariage sans pack', 'organization_type' => 'personal', 'event_type_id' => $type->id,
            'event_name' => 'A & B', 'starts_at' => '2027-11-10', 'timezone' => 'Africa/Kinshasa',
            'format' => 'physical', 'venue_name' => '', 'venue_address' => '', 'city' => 'Kinshasa',
            'country_code' => 'CD', 'currency' => 'USD', 'estimated_guests' => 50, 'modules' => ['media', 'gallery'],
        ]);
        $url = "/api/organizations/{$result['organization']->slug}/events/{$result['event']->slug}/media";

        $this->actingAs($owner)->postJson($url, [
            'file' => UploadedFile::fake()->create('souvenir.mp4', 100, 'video/mp4'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('photos', 0);
    }
}
