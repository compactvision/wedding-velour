<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'badges.view' => 'Consulter les badges',
        'badges.manage' => 'Gérer les modèles de badges',
        'badges.issue' => 'Émettre et révoquer les badges',
    ];

    public function up(): void
    {
        Schema::create('badge_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->string('format', 30)->default('portrait');
            $table->string('primary_color', 7)->default('#B98235');
            $table->boolean('show_qr')->default(true);
            $table->boolean('show_organization')->default(true);
            $table->string('status', 20)->default('active')->index();
            $table->uuid('created_by_user_id');
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['event_id', 'name']);
        });

        Schema::create('badges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('badge_template_id')->nullable();
            $table->uuid('guest_id')->nullable();
            $table->uuid('ticket_id')->nullable();
            $table->string('holder_name');
            $table->string('holder_role')->nullable();
            $table->string('code', 64)->unique();
            $table->string('status', 20)->default('issued')->index();
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->uuid('issued_by_user_id');
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('badge_template_id')->references('id')->on('badge_templates')->nullOnDelete();
            $table->foreign('guest_id')->references('id')->on('guests')->nullOnDelete();
            $table->foreign('ticket_id')->references('id')->on('tickets')->nullOnDelete();
            $table->foreign('issued_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['event_id', 'guest_id']);
            $table->unique(['event_id', 'ticket_id']);
            $table->index(['event_id', 'status']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(['key' => $key], [
                'module_slug' => 'badges',
                'description' => $description,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')->whereIn('slug', ['organization_admin', 'event_organizer', 'badge_manager'])
            ->pluck('id')->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
                }
            });

        $viewPermissionId = DB::table('permissions')->where('key', 'badges.view')->value('id');
        $issuePermissionId = DB::table('permissions')->where('key', 'badges.issue')->value('id');
        DB::table('roles')->where('slug', 'access_controller')->pluck('id')->each(function ($roleId) use ($viewPermissionId) {
            DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $viewPermissionId]);
        });
        DB::table('roles')->where('slug', 'ticket_manager')->pluck('id')->each(function ($roleId) use ($viewPermissionId, $issuePermissionId) {
            foreach ([$viewPermissionId, $issuePermissionId] as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        });

        $moduleId = DB::table('modules')->where('slug', 'badges')->value('id');
        $weddingId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($moduleId && $weddingId) {
            DB::table('events')->where('event_type_id', $weddingId)->get(['id', 'organization_id'])
                ->each(function ($event) use ($moduleId, $now) {
                    DB::table('event_modules')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'organization_id' => $event->organization_id,
                        'event_id' => $event->id,
                        'module_id' => $moduleId,
                        'status' => 'enabled',
                        'source' => 'migration-badges-default',
                        'enabled_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-badges-default')->delete();
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
        Schema::dropIfExists('badges');
        Schema::dropIfExists('badge_templates');
    }
};
