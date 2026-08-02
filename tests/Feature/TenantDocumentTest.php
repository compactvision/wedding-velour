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

class TenantDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_uploads_versions_downloads_and_deletes_private_document(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create(['role' => 'admin', 'is_active' => true, 'status' => 'active']);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Docs', 'organization_type' => 'business',
            'event_type_id' => $type->id, 'event_name' => 'Conférence Docs',
            'starts_at' => '2027-11-10', 'timezone' => 'Africa/Kinshasa',
            'format' => 'physical', 'venue_name' => '', 'venue_address' => '',
            'city' => 'Kinshasa', 'country_code' => 'CD', 'currency' => 'USD',
            'estimated_guests' => 50, 'modules' => ['documents'],
        ]);
        $organization = $result['organization'];
        $event = $result['event'];
        $url = "/api/organizations/{$organization->slug}/events/{$event->slug}/documents";
        $documentId = $this->actingAs($owner)->post($url, [
            'title' => 'Contrat salle', 'category' => 'contract',
            'file' => UploadedFile::fake()->create('contrat.pdf', 100, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('data.versions.0.version_number', 1)->json('data.id');
        $versionId = $this->actingAs($owner)->post("{$url}/{$documentId}/versions", [
            'file' => UploadedFile::fake()->create('contrat-v2.pdf', 120, 'application/pdf'),
        ])->assertCreated()->assertJsonPath('data.version_number', 2)->json('data.id');

        $this->actingAs($owner)->get("{$url}/{$documentId}/versions/{$versionId}/download")->assertOk();
        $this->actingAs($owner)->getJson($url)
            ->assertJsonPath('data.summary.document_count', 1)
            ->assertJsonPath('data.summary.contract_count', 1);
        $this->actingAs($owner)->deleteJson("{$url}/{$documentId}")->assertNoContent();
        $this->assertDatabaseMissing('event_documents', ['id' => $documentId]);
    }
}
