<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PERMISSIONS = [
        'invitations.view' => 'Consulter les invitations',
        'invitations.update' => 'Personnaliser les invitations',
        'rsvps.view' => 'Consulter les réponses RSVP',
    ];

    public function up(): void
    {
        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => str($key)->before('.')->toString(),
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
                ? ['rsvps.view']
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
        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');

        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
