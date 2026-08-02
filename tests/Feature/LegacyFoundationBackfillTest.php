<?php

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventModule;
use App\Models\LegacyMigrationRecord;
use App\Models\MigrationRun;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LegacyFoundationBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_foundation_backfill_is_idempotent_and_preserves_legacy_rows(): void
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        $wedding = WeddingModel::query()->create([
            'id' => (string) Str::uuid(),
            'title' => 'Mariage Héritage',
            'date' => '2026-12-20',
            'venue' => 'Salle Planivo',
            'status' => 'planning',
            'max_guests' => 120,
            'invitation_custom' => ['primaryColor' => '#4b2142'],
        ]);
        $doorAgent = User::factory()->create([
            'role' => 'door',
            'wedding_id' => $wedding->id,
            'is_active' => true,
            'status' => 'active',
        ]);
        $table = WeddingTableModel::query()->create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'name' => 'Table famille',
        ]);
        $guest = GuestModel::query()->create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Amina',
            'last_name' => 'K.',
            'table_id' => $table->id,
            'invitation_link' => 'legacy-amina-token',
        ]);

        $arguments = [
            'owner' => $owner->id,
            '--name' => 'Organisation historique',
            '--slug' => 'organisation-historique',
            '--timezone' => 'Africa/Kinshasa',
            '--country' => 'CD',
        ];

        $this->artisan('planivo:migration:backfill-foundation', $arguments)
            ->assertSuccessful();
        $this->artisan('planivo:migration:backfill-foundation', $arguments)
            ->assertSuccessful();

        $organization = Organization::query()->sole();
        $event = Event::query()->sole();

        $this->assertDatabaseCount('organizations', 1);
        $this->assertDatabaseCount('events', 1);
        $this->assertDatabaseCount('weddings', 1);
        $this->assertDatabaseCount('guests', 1);
        $this->assertDatabaseCount('legacy_migration_records', 1);
        $this->assertDatabaseCount('migration_runs', 2);
        $this->assertSame(2, MigrationRun::query()->where('status', 'completed')->count());

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'organization_id' => $organization->id,
            'legacy_wedding_id' => $wedding->id,
            'name' => 'Mariage Héritage',
        ]);
        $this->assertDatabaseHas('guests', [
            'id' => $guest->id,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'invitation_link' => 'legacy-amina-token',
        ]);
        $this->assertDatabaseHas('wedding_tables', [
            'id' => $table->id,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
        ]);

        $this->assertTrue(
            OrganizationMember::query()
                ->where('organization_id', $organization->id)
                ->where('user_id', $owner->id)
                ->exists(),
        );
        $this->assertTrue(
            EventMember::query()
                ->where('event_id', $event->id)
                ->whereHas(
                    'organizationMember',
                    fn ($query) => $query->where('user_id', $doorAgent->id),
                )
                ->exists(),
        );
        $this->assertTrue(
            EventModule::query()
                ->where('event_id', $event->id)
                ->whereHas(
                    'event',
                    fn ($query) => $query->where('organization_id', $organization->id),
                )
                ->exists(),
        );
        $this->assertSame(
            $event->id,
            LegacyMigrationRecord::query()->sole()->target_id,
        );
    }
}
