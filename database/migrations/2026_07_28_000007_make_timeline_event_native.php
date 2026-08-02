<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERMISSIONS = [
        'schedule.view' => 'Consulter le programme',
        'schedule.update' => 'Gérer le programme et son avancement',
    ];

    public function up(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('ends_at')->nullable();
            $table->string('location')->nullable();
            $table->string('responsible_name')->nullable();
            $table->string('visibility')->default('public')->index();
            $table->unsignedInteger('sort_order')->default(0);
        });

        $events = DB::table('timeline_events')
            ->whereNotNull('event_id')
            ->whereNull('starts_at')
            ->get();
        foreach ($events as $timelineEvent) {
            $event = DB::table('events')->where('id', $timelineEvent->event_id)->first();
            if (! $event?->starts_at) {
                continue;
            }

            $timezone = $event->timezone ?: 'UTC';
            $localStart = CarbonImmutable::parse($event->starts_at)
                ->setTimezone($timezone)
                ->startOfDay();
            if (preg_match('/^\d{2}:\d{2}/', (string) $timelineEvent->time, $matches)) {
                [$hours, $minutes] = array_map('intval', explode(':', $matches[0]));
                $localStart = $localStart->setTime($hours, $minutes);
            }

            DB::table('timeline_events')
                ->where('id', $timelineEvent->id)
                ->update(['starts_at' => $localStart->utc()]);
        }

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'schedule',
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id', 'key');
        $roles = DB::table('roles')
            ->whereIn('slug', [
                'organization_admin',
                'event_organizer',
                'access_controller',
            ])
            ->get();

        foreach ($roles as $role) {
            $keys = $role->slug === 'access_controller'
                ? ['schedule.view']
                : array_keys(self::PERMISSIONS);

            foreach ($keys as $key) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $role->id,
                    'permission_id' => $permissionIds[$key],
                ]);
            }
        }
    }

    public function down(): void
    {
        if (DB::table('timeline_events')->whereNull('wedding_id')->exists()) {
            throw new RuntimeException(
                'Le rollback nécessite de rattacher les activités natives à un mariage historique.',
            );
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::table('timeline_events', function (Blueprint $table) {
            $table->dropIndex(['starts_at']);
            $table->dropIndex(['visibility']);
            $table->dropColumn([
                'starts_at',
                'ends_at',
                'location',
                'responsible_name',
                'visibility',
                'sort_order',
            ]);
            $table->uuid('wedding_id')->nullable(false)->change();
        });
    }
};
