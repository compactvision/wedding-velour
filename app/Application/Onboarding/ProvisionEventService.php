<?php

namespace App\Application\Onboarding;

use App\Application\Migration\FoundationCatalogService;
use App\Models\Event;
use App\Models\EventMember;
use App\Models\EventModule;
use App\Models\EventModuleDefinition;
use App\Models\EventSetting;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProvisionEventService
{
    public function __construct(private readonly FoundationCatalogService $catalog) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{organization: Organization, event: Event}
     */
    public function provision(User $user, array $data, ?Organization $organization = null): array
    {
        return DB::transaction(function () use ($user, $data, $organization) {
            $this->catalog->seed();

            $organization ??= $this->createOrganization($user, $data);
            $membership = $this->ensureMembership($organization, $user);
            $roles = $this->catalog->seedOrganizationRoles($organization);
            $membership->roles()->syncWithoutDetaching([$roles['organization_admin']->id]);

            $eventType = EventType::query()
                ->whereKey($data['event_type_id'])
                ->where('status', 'active')
                ->with('modules')
                ->firstOrFail();

            $event = Event::query()->create([
                'id' => (string) Str::uuid(),
                'organization_id' => $organization->id,
                'event_type_id' => $eventType->id,
                'created_by_user_id' => $user->id,
                'name' => $data['event_name'],
                'slug' => $this->uniqueEventSlug($organization, $data['event_name']),
                'status' => 'active',
                'starts_at' => CarbonImmutable::parse(
                    $data['starts_at'].' 12:00',
                    $data['timezone'],
                )->utc(),
                'timezone' => $data['timezone'],
                'format' => $data['format'],
                'venue_name' => $data['venue_name'] ?: null,
                'venue_address' => $data['venue_address'] ?: null,
                'city' => $data['city'] ?: null,
                'country_code' => $data['country_code'] ?: null,
                'estimated_guests' => $data['estimated_guests'],
                'visibility' => 'invitation',
            ]);

            EventSetting::query()->create([
                'id' => (string) Str::uuid(),
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'locale' => $user->locale ?: 'fr',
                'branding' => [
                    'primary_color' => $eventType->primary_color,
                    'source' => 'event_type',
                ],
                'privacy' => ['visibility' => 'invitation'],
            ]);

            $eventMember = EventMember::query()->create([
                'id' => (string) Str::uuid(),
                'event_id' => $event->id,
                'organization_member_id' => $membership->id,
                'status' => 'active',
                'assigned_at' => now(),
            ]);
            $eventMember->roles()->syncWithoutDetaching([$roles['event_organizer']->id]);

            foreach ($this->resolveModules($eventType, $data['modules']) as $module) {
                EventModule::query()->create([
                    'id' => (string) Str::uuid(),
                    'organization_id' => $organization->id,
                    'event_id' => $event->id,
                    'module_id' => $module->id,
                    'status' => 'enabled',
                    'source' => 'onboarding',
                    'enabled_at' => now(),
                ]);
            }

            return [
                'organization' => $organization->fresh(),
                'event' => $event->fresh(['type', 'enabledModules']),
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createOrganization(User $user, array $data): Organization
    {
        $baseSlug = Str::slug($data['organization_name']) ?: 'organisation';
        $slug = $baseSlug;
        $suffix = 1;

        while (Organization::query()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.++$suffix;
        }

        return Organization::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $user->id,
            'name' => $data['organization_name'],
            'slug' => $slug,
            'type' => $data['organization_type'],
            'status' => 'active',
            'country_code' => $data['country_code'] ?: null,
            'currency' => $data['currency'],
            'timezone' => $data['timezone'],
            'settings' => ['onboarding_completed_at' => now()->toIso8601String()],
        ]);
    }

    private function ensureMembership(
        Organization $organization,
        User $user,
    ): OrganizationMember {
        return OrganizationMember::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $user->id,
            ],
            [
                'id' => (string) Str::uuid(),
                'status' => 'active',
                'joined_at' => now(),
            ],
        );
    }

    /**
     * @param  array<int, string>  $selectedSlugs
     * @return Collection<int, EventModuleDefinition>
     */
    private function resolveModules(EventType $eventType, array $selectedSlugs): Collection
    {
        $available = $eventType->modules->keyBy('slug');
        $resolved = $eventType->modules
            ->filter(fn ($module) => $module->pivot->default_enabled
                || in_array($module->slug, $selectedSlugs, true))
            ->keyBy('slug');

        $queue = $resolved->values();
        while ($queue->isNotEmpty()) {
            $module = $queue->shift();

            foreach ($module->dependencies ?? [] as $dependencySlug) {
                if ($resolved->has($dependencySlug) || ! $available->has($dependencySlug)) {
                    continue;
                }

                $dependency = $available->get($dependencySlug);
                $resolved->put($dependencySlug, $dependency);
                $queue->push($dependency);
            }
        }

        return $resolved->values();
    }

    private function uniqueEventSlug(Organization $organization, string $name): string
    {
        $baseSlug = Str::slug($name) ?: 'evenement';
        $slug = $baseSlug;
        $suffix = 1;

        while (Event::query()
            ->where('organization_id', $organization->id)
            ->where('slug', $slug)
            ->exists()) {
            $slug = $baseSlug.'-'.++$suffix;
        }

        return $slug;
    }
}
