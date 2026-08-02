<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'checkins.view' => 'Consulter les entrées',
        'checkins.manage' => 'Annuler un pointage',
    ];

    public function up(): void
    {
        Schema::create('check_ins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('guest_id');
            $table->uuid('checked_in_by_user_id')->nullable();
            $table->unsignedInteger('party_size')->default(1);
            $table->string('method')->default('manual');
            $table->string('checkpoint')->default('main_entrance');
            $table->timestamp('checked_in_at');
            $table->timestamp('revoked_at')->nullable();
            $table->boolean('active_marker')->nullable()->default(true);
            $table->uuid('revoked_by_user_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('guest_id')->references('id')->on('guests')->cascadeOnDelete();
            $table->foreign('checked_in_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('revoked_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['event_id', 'revoked_at', 'checked_in_at']);
            $table->index(['guest_id', 'revoked_at']);
            $table->unique(['guest_id', 'active_marker']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'checkins',
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
            ->whereIn('slug', ['organization_admin', 'event_organizer', 'access_controller'])
            ->get();

        foreach ($roles as $role) {
            $keys = $role->slug === 'access_controller'
                ? ['checkins.view']
                : array_keys(self::PERMISSIONS);
            foreach ($keys as $key) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $role->id,
                    'permission_id' => $permissionIds[$key],
                ]);
            }
        }

        $qrModuleId = DB::table('modules')->where('slug', 'qr_access')->value('id');
        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($qrModuleId && $weddingTypeId) {
            DB::table('event_type_modules')
                ->where('event_type_id', $weddingTypeId)
                ->where('module_id', $qrModuleId)
                ->update(['default_enabled' => true]);

            DB::table('events')
                ->where('event_type_id', $weddingTypeId)
                ->get(['id', 'organization_id'])
                ->each(function ($event) use ($qrModuleId, $now) {
                    DB::table('event_modules')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'organization_id' => $event->organization_id,
                        'event_id' => $event->id,
                        'module_id' => $qrModuleId,
                        'status' => 'enabled',
                        'source' => 'migration-access-default',
                        'enabled_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('check_ins');

        $qrModuleId = DB::table('modules')->where('slug', 'qr_access')->value('id');
        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        DB::table('event_modules')
            ->where('source', 'migration-access-default')
            ->delete();
        if ($qrModuleId && $weddingTypeId) {
            DB::table('event_type_modules')
                ->where('event_type_id', $weddingTypeId)
                ->where('module_id', $qrModuleId)
                ->update(['default_enabled' => false]);
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
