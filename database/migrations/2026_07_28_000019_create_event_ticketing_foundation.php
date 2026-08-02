<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'ticketing.view' => 'Consulter la billetterie',
        'ticketing.manage' => 'Gérer les catégories et quotas',
        'ticketing.sales' => 'Créer et confirmer les commandes',
        'ticketing.scan' => 'Contrôler les billets QR',
    ];

    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price_minor')->default(0);
            $table->string('currency', 3);
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('sold_count')->default(0);
            $table->string('status')->default('active')->index();
            $table->timestamp('sales_start_at')->nullable();
            $table->timestamp('sales_end_at')->nullable();
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'name']);
        });

        Schema::create('ticket_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('reference', 80);
            $table->string('buyer_name');
            $table->string('buyer_email')->nullable();
            $table->string('buyer_phone', 40)->nullable();
            $table->unsignedBigInteger('total_minor');
            $table->string('currency', 3);
            $table->string('status')->default('pending')->index();
            $table->uuid('created_by_user_id');
            $table->uuid('confirmed_by_user_id')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('confirmed_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['event_id', 'reference']);
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('ticket_type_id');
            $table->uuid('ticket_order_id');
            $table->string('holder_name');
            $table->string('holder_email')->nullable();
            $table->string('token', 64)->unique();
            $table->string('status')->default('issued')->index();
            $table->timestamp('scanned_at')->nullable();
            $table->uuid('scanned_by_user_id')->nullable();
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('ticket_type_id')->references('id')->on('ticket_types')->restrictOnDelete();
            $table->foreign('ticket_order_id')->references('id')->on('ticket_orders')->cascadeOnDelete();
            $table->foreign('scanned_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['event_id', 'status']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(['key' => $key], [
                'module_slug' => 'ticketing', 'description' => $description,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        $ids = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')->whereIn('slug', ['organization_admin', 'event_organizer', 'ticket_manager', 'access_controller'])
            ->pluck('id')->each(function ($roleId) use ($ids) {
                foreach ($ids as $id) {
                    DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $id]);
                }
            });
        $moduleId = DB::table('modules')->where('slug', 'ticketing')->value('id');
        $weddingId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($moduleId && $weddingId) {
            DB::table('events')->where('event_type_id', $weddingId)->get(['id', 'organization_id'])->each(function ($event) use ($moduleId, $now) {
                DB::table('event_modules')->insertOrIgnore([
                    'id' => (string) Str::uuid(), 'organization_id' => $event->organization_id, 'event_id' => $event->id,
                    'module_id' => $moduleId, 'status' => 'enabled', 'source' => 'migration-ticketing-default',
                    'enabled_at' => $now, 'created_at' => $now, 'updated_at' => $now,
                ]);
            });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-ticketing-default')->delete();
        $ids = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('ticket_orders');
        Schema::dropIfExists('ticket_types');
    }
};
