<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const PERMISSIONS = [
        'notifications.view' => 'Consulter les communications',
        'notifications.update' => 'Créer et publier les communications',
    ];

    public function up(): void
    {
        Schema::table('wedding_notifications', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
            $table->string('scope')->default('activity')->index();
            $table->string('audience')->default('team')->index();
            $table->string('channel')->default('in_app');
            $table->string('delivery_status')->default('delivered')->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('recipient_count')->default(0);
            $table->uuid('created_by_user_id')->nullable();
            $table->string('action_url')->nullable();

            $table->foreign('created_by_user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        DB::table('wedding_notifications')->update([
            'scope' => 'activity',
            'audience' => 'team',
            'delivery_status' => 'delivered',
            'sent_at' => DB::raw('created_at'),
        ]);

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'notifications',
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
                ? ['notifications.view']
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
        if (DB::table('wedding_notifications')->whereNull('wedding_id')->exists()) {
            throw new RuntimeException(
                'Le rollback nécessite de rattacher les communications natives à un mariage historique.',
            );
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::table('wedding_notifications', function (Blueprint $table) {
            $table->dropForeign(['created_by_user_id']);
            $table->dropIndex(['scope']);
            $table->dropIndex(['audience']);
            $table->dropIndex(['delivery_status']);
            $table->dropIndex(['scheduled_at']);
            $table->dropColumn([
                'scope',
                'audience',
                'channel',
                'delivery_status',
                'scheduled_at',
                'sent_at',
                'recipient_count',
                'created_by_user_id',
                'action_url',
            ]);
            $table->uuid('wedding_id')->nullable(false)->change();
        });
    }
};
