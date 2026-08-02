<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERMISSIONS = [
        'seating.view' => 'Consulter le plan de salle',
        'seating.update' => 'Gérer les tables et les placements',
    ];

    public function up(): void
    {
        Schema::table('wedding_tables', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'seating',
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
                ? ['seating.view']
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
        if (DB::table('wedding_tables')->whereNull('wedding_id')->exists()) {
            throw new RuntimeException(
                'Le rollback nécessite de rattacher les tables natives à un mariage historique.',
            );
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::table('wedding_tables', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable(false)->change();
        });
    }
};
