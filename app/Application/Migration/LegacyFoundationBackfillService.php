<?php

namespace App\Application\Migration;

use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventModule;
use App\Models\EventModuleDefinition;
use App\Models\EventSetting;
use App\Models\LegacyMigrationRecord;
use App\Models\MigrationRun;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class LegacyFoundationBackfillService
{
    private const LEGACY_TABLES = [
        'wedding_tables',
        'guests',
        'menu_items',
        'orders',
        'photos',
        'timeline_events',
        'wedding_notifications',
    ];

    public function __construct(private readonly FoundationCatalogService $catalog) {}

    public function run(
        User $owner,
        string $organizationName,
        string $organizationSlug,
        string $timezone,
        ?string $countryCode = null,
    ): MigrationRun {
        $run = MigrationRun::query()->create([
            'id' => (string) Str::uuid(),
            'name' => 'legacy-foundation-backfill',
            'environment' => app()->environment(),
            'status' => 'running',
            'started_at' => now(),
            'initiated_by' => $owner->id,
            'source_counts' => $this->sourceCounts(),
        ]);

        try {
            $eventType = $this->catalog->seed();
            $organization = $this->createOrganization(
                $owner,
                $organizationName,
                $organizationSlug,
                $timezone,
                $countryCode,
            );
            $roles = $this->catalog->seedOrganizationRoles($organization);

            WeddingModel::query()
                ->orderBy('id')
                ->chunkById(200, function ($weddings) use (
                    $run,
                    $owner,
                    $organization,
                    $eventType,
                    $roles,
                    $timezone,
                    $countryCode,
                ) {
                    foreach ($weddings as $wedding) {
                        DB::transaction(function () use (
                            $run,
                            $owner,
                            $organization,
                            $eventType,
                            $roles,
                            $timezone,
                            $countryCode,
                            $wedding,
                        ) {
                            $event = $this->backfillEvent(
                                $run,
                                $owner,
                                $organization,
                                $eventType->id,
                                $wedding,
                                $timezone,
                                $countryCode,
                            );
                            $this->backfillLegacyColumns($run, $organization, $event, $wedding);
                            $this->backfillMemberships($organization, $event, $wedding->id, $roles, $owner);
                            $this->activateLegacyModules($organization, $event, $wedding->id);
                        });
                    }
                });

            $run->update([
                'status' => 'completed',
                'completed_at' => now(),
                'target_counts' => $this->targetCounts($organization),
            ]);
        } catch (Throwable $exception) {
            $run->update([
                'status' => 'failed',
                'completed_at' => now(),
                'error_summary' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        return $run->fresh();
    }

    private function createOrganization(
        User $owner,
        string $name,
        string $slug,
        string $timezone,
        ?string $countryCode,
    ): Organization {
        $organization = Organization::query()->firstOrCreate(
            ['slug' => $slug],
            [
                'id' => (string) Str::uuid(),
                'owner_user_id' => $owner->id,
                'name' => $name,
                'type' => 'personal',
                'status' => 'active',
                'country_code' => $countryCode,
                'currency' => 'USD',
                'timezone' => $timezone,
                'settings' => ['source' => 'legacy_migration'],
            ],
        );

        OrganizationMember::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
            ],
            [
                'id' => (string) Str::uuid(),
                'status' => 'active',
                'joined_at' => now(),
            ],
        );

        return $organization;
    }

    private function backfillEvent(
        MigrationRun $run,
        User $owner,
        Organization $organization,
        string $eventTypeId,
        WeddingModel $wedding,
        string $timezone,
        ?string $countryCode,
    ): Event {
        $event = Event::query()->firstOrNew(['legacy_wedding_id' => $wedding->id]);
        $event->fill([
            'id' => $event->id ?: (string) Str::uuid(),
            'organization_id' => $organization->id,
            'event_type_id' => $eventTypeId,
            'created_by_user_id' => $owner->id,
            'name' => $wedding->title,
            'slug' => $event->slug ?: $this->uniqueEventSlug($organization, $wedding),
            'status' => $this->mapEventStatus($wedding->status),
            'starts_at' => CarbonImmutable::parse($wedding->date, $timezone)
                ->setTime(12, 0)
                ->utc(),
            'timezone' => $timezone,
            'format' => 'physical',
            'venue_name' => $wedding->venue,
            'venue_address' => $wedding->venue_address,
            'country_code' => $countryCode,
            'estimated_guests' => max(0, (int) $wedding->max_guests),
            'visibility' => 'invitation',
        ]);
        $event->save();

        EventSetting::query()->updateOrCreate(
            ['event_id' => $event->id],
            [
                'id' => EventSetting::query()->where('event_id', $event->id)->value('id')
                    ?: (string) Str::uuid(),
                'organization_id' => $organization->id,
                'locale' => 'fr',
                'branding' => $wedding->invitation_custom,
                'privacy' => ['visibility' => 'invitation'],
            ],
        );

        $this->record(
            $run,
            'weddings',
            $wedding->id,
            'events',
            $event->id,
            $wedding->only([
                'id', 'title', 'date', 'venue', 'venue_address', 'status', 'max_guests',
            ]),
            $event->only([
                'id', 'organization_id', 'name', 'starts_at', 'status', 'estimated_guests',
            ]),
        );

        return $event;
    }

    private function backfillLegacyColumns(
        MigrationRun $run,
        Organization $organization,
        Event $event,
        WeddingModel $wedding,
    ): void {
        $now = now();
        WeddingModel::query()->whereKey($wedding->id)->update([
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'migrated_at' => $now,
            'migration_run_id' => $run->id,
        ]);

        foreach (self::LEGACY_TABLES as $table) {
            DB::table($table)
                ->where('wedding_id', $wedding->id)
                ->update([
                    'organization_id' => $organization->id,
                    'event_id' => $event->id,
                    'migrated_at' => $now,
                    'migration_run_id' => $run->id,
                ]);
        }
    }

    private function backfillMemberships(
        Organization $organization,
        Event $event,
        string $weddingId,
        array $roles,
        User $owner,
    ): void {
        $users = User::query()
            ->where('wedding_id', $weddingId)
            ->orWhere('id', $owner->id)
            ->get();

        foreach ($users as $user) {
            $membership = OrganizationMember::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $user->id,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'status' => $user->is_active ? 'active' : 'suspended',
                    'joined_at' => now(),
                ],
            );

            $roleSlug = match ($user->role) {
                'admin' => 'organization_admin',
                'manager' => 'event_organizer',
                'server' => 'catering_operator',
                'door' => 'access_controller',
                default => null,
            };

            if ($roleSlug === 'organization_admin') {
                $membership->roles()->syncWithoutDetaching([$roles[$roleSlug]->id]);
            }

            $eventMember = EventMember::query()->firstOrCreate(
                [
                    'event_id' => $event->id,
                    'organization_member_id' => $membership->id,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'status' => $membership->status,
                    'assigned_at' => now(),
                ],
            );

            if ($roleSlug) {
                $eventMember->roles()->syncWithoutDetaching([$roles[$roleSlug]->id]);
            }
        }
    }

    private function activateLegacyModules(
        Organization $organization,
        Event $event,
        string $weddingId,
    ): void {
        $slugs = ['guests', 'invitations', 'rsvps', 'notifications'];
        $conditions = [
            'seating' => DB::table('wedding_tables')->where('wedding_id', $weddingId)->exists(),
            'catering' => DB::table('menu_items')->where('wedding_id', $weddingId)->exists()
                || DB::table('orders')->where('wedding_id', $weddingId)->exists(),
            'schedule' => DB::table('timeline_events')->where('wedding_id', $weddingId)->exists(),
            'media' => DB::table('photos')->where('wedding_id', $weddingId)->exists(),
            'gallery' => DB::table('photos')->where('wedding_id', $weddingId)->exists(),
            'qr_access' => User::query()
                ->where('wedding_id', $weddingId)
                ->where('role', 'door')
                ->exists(),
        ];

        foreach ($conditions as $slug => $enabled) {
            if ($enabled) {
                $slugs[] = $slug;
            }
        }

        $modules = EventModuleDefinition::query()->whereIn('slug', array_unique($slugs))->get();
        foreach ($modules as $module) {
            EventModule::query()->firstOrCreate(
                ['event_id' => $event->id, 'module_id' => $module->id],
                [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $organization->id,
                    'status' => 'enabled',
                    'source' => 'legacy_migration',
                    'enabled_at' => now(),
                ],
            );
        }
    }

    private function uniqueEventSlug(Organization $organization, WeddingModel $wedding): string
    {
        $base = Str::slug($wedding->title) ?: 'evenement';
        $slug = $base;
        $suffix = 1;

        while (Event::query()
            ->where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->where('legacy_wedding_id', '!=', $wedding->id)
            ->exists()) {
            $slug = "{$base}-".++$suffix;
        }

        return $slug;
    }

    private function mapEventStatus(?string $status): string
    {
        return match ($status) {
            'active', 'planning' => 'active',
            'completed' => 'completed',
            'cancelled' => 'cancelled',
            default => 'draft',
        };
    }

    private function record(
        MigrationRun $run,
        string $sourceTable,
        string $sourceId,
        string $targetTable,
        string $targetId,
        array $source,
        array $target,
    ): void {
        LegacyMigrationRecord::query()->updateOrCreate(
            [
                'source_table' => $sourceTable,
                'source_id' => $sourceId,
                'target_table' => $targetTable,
            ],
            [
                'id' => LegacyMigrationRecord::query()
                    ->where('source_table', $sourceTable)
                    ->where('source_id', $sourceId)
                    ->where('target_table', $targetTable)
                    ->value('id') ?: (string) Str::uuid(),
                'migration_run_id' => $run->id,
                'target_id' => $targetId,
                'source_checksum' => $this->checksum($source),
                'target_checksum' => $this->checksum($target),
                'status' => 'migrated',
                'error' => null,
            ],
        );
    }

    private function checksum(array $data): string
    {
        ksort($data);

        return hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function sourceCounts(): array
    {
        return collect(['weddings', ...self::LEGACY_TABLES, 'users'])
            ->mapWithKeys(fn ($table) => [$table => DB::table($table)->count()])
            ->all();
    }

    private function targetCounts(Organization $organization): array
    {
        return [
            'organizations' => Organization::query()->whereKey($organization->id)->count(),
            'organization_members' => OrganizationMember::query()
                ->where('organization_id', $organization->id)
                ->count(),
            'events' => Event::query()->where('organization_id', $organization->id)->count(),
            'event_members' => EventMember::query()
                ->whereHas('event', fn ($query) => $query->where('organization_id', $organization->id))
                ->count(),
            'event_modules' => EventModule::query()
                ->where('organization_id', $organization->id)
                ->count(),
        ];
    }
}
