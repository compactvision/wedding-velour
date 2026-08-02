<?php

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LegacyEntityIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_cannot_read_or_delete_another_events_resource_by_id(): void
    {
        $weddingA = $this->createWedding('Événement A');
        $weddingB = $this->createWedding('Événement B');
        $guestB = GuestModel::query()->create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $weddingB->id,
            'first_name' => 'Invité',
            'last_name' => 'B',
        ]);
        $manager = User::factory()->create([
            'role' => 'manager',
            'wedding_id' => $weddingA->id,
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($manager)
            ->getJson("/api/entities/guest/{$guestB->id}")
            ->assertForbidden();

        $this->actingAs($manager)
            ->deleteJson("/api/entities/guest/{$guestB->id}")
            ->assertForbidden();

        $this->actingAs($manager)
            ->putJson("/api/entities/wedding/{$weddingB->id}", ['title' => 'Intrusion'])
            ->assertForbidden();

        $this->assertDatabaseHas('guests', ['id' => $guestB->id]);
        $this->assertDatabaseHas('weddings', [
            'id' => $weddingB->id,
            'title' => 'Événement B',
        ]);
    }

    public function test_non_admin_without_an_assigned_event_cannot_list_legacy_entities(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager',
            'wedding_id' => null,
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($manager)
            ->getJson('/api/entities/guest')
            ->assertForbidden();
    }

    private function createWedding(string $title): WeddingModel
    {
        return WeddingModel::query()->create([
            'id' => (string) Str::uuid(),
            'title' => $title,
            'date' => '2026-12-20',
        ]);
    }
}
