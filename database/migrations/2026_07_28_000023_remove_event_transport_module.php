<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERMISSIONS = [
        'transport.view',
        'transport.manage',
        'transport.board',
    ];

    public function up(): void
    {
        $moduleId = DB::table('modules')->where('slug', 'transport')->value('id');

        if ($moduleId) {
            DB::table('event_modules')->where('module_id', $moduleId)->delete();
            DB::table('event_type_modules')->where('module_id', $moduleId)->delete();
            DB::table('modules')->where('id', $moduleId)->delete();
        }

        DB::table('roles')->where('slug', 'transport_manager')->delete();

        $permissionIds = DB::table('permissions')
            ->whereIn('key', self::PERMISSIONS)
            ->pluck('id');

        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::dropIfExists('transport_passengers');
        Schema::dropIfExists('transport_routes');
    }

    public function down(): void
    {
        // Le retrait du module et de ses données est volontairement irréversible.
    }
};
