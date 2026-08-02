<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERMISSIONS = [
        'team.view' => 'Consulter les collaborateurs',
        'team.manage' => 'Inviter et gérer les collaborateurs',
    ];

    public function up(): void
    {
        Schema::table('organization_invitations', function (Blueprint $table) {
            $table->uuid('event_id')->nullable()->after('organization_id');
            $table->uuid('accepted_by_user_id')->nullable();
            $table->timestamp('last_sent_at')->nullable();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('accepted_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['event_id', 'status', 'created_at']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'team',
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('roles')
            ->whereIn('slug', ['organization_admin', 'event_organizer'])
            ->pluck('id')
            ->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                    ]);
                }
            });
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::table('organization_invitations', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropForeign(['accepted_by_user_id']);
            $table->dropIndex(['event_id', 'status', 'created_at']);
            $table->dropColumn(['event_id', 'accepted_by_user_id', 'last_sent_at']);
        });
    }
};
