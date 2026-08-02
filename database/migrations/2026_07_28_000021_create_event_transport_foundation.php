<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'transport.view' => 'Consulter les trajets et affectations',
        'transport.manage' => 'Gérer les trajets et les passagers',
        'transport.board' => 'Enregistrer les embarquements',
    ];

    public function up(): void
    {
        Schema::create('transport_routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->string('direction', 20)->default('outbound');
            $table->string('departure_location');
            $table->string('arrival_location');
            $table->timestamp('departure_at');
            $table->unsignedInteger('capacity');
            $table->string('vehicle')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_phone', 40)->nullable();
            $table->string('status', 20)->default('scheduled')->index();
            $table->text('notes')->nullable();
            $table->uuid('created_by_user_id');
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['event_id', 'departure_at']);
        });

        Schema::create('transport_passengers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('transport_route_id');
            $table->uuid('guest_id');
            $table->string('pickup_location')->nullable();
            $table->string('seat_number', 30)->nullable();
            $table->string('status', 20)->default('booked')->index();
            $table->timestamp('boarded_at')->nullable();
            $table->uuid('checked_in_by_user_id')->nullable();
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('transport_route_id')->references('id')->on('transport_routes')->cascadeOnDelete();
            $table->foreign('guest_id')->references('id')->on('guests')->cascadeOnDelete();
            $table->foreign('checked_in_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['transport_route_id', 'guest_id']);
            $table->index(['event_id', 'guest_id']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(['key' => $key], [
                'module_slug' => 'transport',
                'description' => $description,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')->whereIn('slug', ['organization_admin', 'event_organizer', 'logistics_manager', 'transport_manager'])
            ->pluck('id')->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
                }
            });

        $viewId = DB::table('permissions')->where('key', 'transport.view')->value('id');
        $boardId = DB::table('permissions')->where('key', 'transport.board')->value('id');
        DB::table('roles')->where('slug', 'access_controller')->pluck('id')->each(function ($roleId) use ($viewId, $boardId) {
            foreach ([$viewId, $boardId] as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        });

        $moduleId = DB::table('modules')->where('slug', 'transport')->value('id');
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
                        'source' => 'migration-transport-default',
                        'enabled_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-transport-default')->delete();
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
        Schema::dropIfExists('transport_passengers');
        Schema::dropIfExists('transport_routes');
    }
};
