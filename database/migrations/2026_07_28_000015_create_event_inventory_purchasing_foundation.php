<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'stock.view' => ['stock', 'Consulter le stock et ses mouvements'],
        'stock.manage' => ['stock', 'Gérer les articles et les mouvements de stock'],
        'purchasing.manage' => ['purchasing', 'Gérer les fournisseurs et les achats'],
        'purchasing.approve' => ['purchasing', 'Approuver et réceptionner les achats'],
    ];

    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'name']);
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->string('sku', 80)->nullable();
            $table->string('category', 120)->nullable();
            $table->string('unit', 30)->default('unité');
            $table->decimal('current_quantity', 12, 3)->default(0);
            $table->decimal('reorder_level', 12, 3)->default(0);
            $table->unsignedBigInteger('unit_cost_minor')->default(0);
            $table->string('currency', 3);
            $table->string('location')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'sku']);
            $table->index(['event_id', 'category']);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('supplier_id')->nullable();
            $table->string('reference', 80);
            $table->string('status')->default('draft')->index();
            $table->string('currency', 3);
            $table->date('expected_on')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by_user_id');
            $table->uuid('approved_by_user_id')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approved_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['event_id', 'reference']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->uuid('inventory_item_id');
            $table->decimal('quantity', 12, 3);
            $table->unsignedBigInteger('unit_cost_minor');
            $table->timestamps();

            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->cascadeOnDelete();
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->restrictOnDelete();
            $table->unique(['purchase_order_id', 'inventory_item_id']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('inventory_item_id');
            $table->uuid('purchase_order_id')->nullable();
            $table->string('type')->index();
            $table->decimal('quantity_delta', 12, 3);
            $table->decimal('quantity_after', 12, 3);
            $table->text('reason')->nullable();
            $table->uuid('created_by_user_id');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->cascadeOnDelete();
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->nullOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['event_id', 'created_at']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => [$module, $description]) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                ['module_slug' => $module, 'description' => $description, 'created_at' => $now, 'updated_at' => $now],
            );
        }

        foreach ([
            'stock' => [
                'name' => 'Stock',
                'description' => 'Articles, niveaux et mouvements de stock.',
                'dependencies' => [],
                'sort_order' => 8,
            ],
            'purchasing' => [
                'name' => 'Achats',
                'description' => 'Fournisseurs et commandes d’achat.',
                'dependencies' => ['stock'],
                'sort_order' => 9,
            ],
        ] as $slug => $definition) {
            $moduleId = DB::table('modules')->where('slug', $slug)->value('id') ?: (string) Str::uuid();
            DB::table('modules')->updateOrInsert(
                ['slug' => $slug],
                [
                    'id' => $moduleId,
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'status' => 'active',
                    'category' => 'core',
                    'dependencies' => json_encode($definition['dependencies']),
                    'sort_order' => $definition['sort_order'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );

            DB::table('event_types')->get(['id', 'slug'])->each(
                function ($eventType) use ($moduleId, $slug) {
                    DB::table('event_type_modules')->updateOrInsert(
                        ['event_type_id' => $eventType->id, 'module_id' => $moduleId],
                        [
                            'recommendation_level' => $eventType->slug === 'wedding'
                                ? 'recommended'
                                : 'optional',
                            'default_enabled' => false,
                            'sort_order' => $slug === 'stock' ? 8 : 9,
                        ],
                    );
                },
            );
        }

        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')
            ->whereIn('slug', ['organization_admin', 'event_organizer', 'financial_manager', 'logistics_manager'])
            ->pluck('id')
            ->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                    ]);
                }
            });

        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        $moduleIds = DB::table('modules')->whereIn('slug', ['stock', 'purchasing'])->pluck('id');
        if ($weddingTypeId && $moduleIds->isNotEmpty()) {
            DB::table('events')->where('event_type_id', $weddingTypeId)->get(['id', 'organization_id'])
                ->each(function ($event) use ($moduleIds, $now) {
                    foreach ($moduleIds as $moduleId) {
                        DB::table('event_modules')->insertOrIgnore([
                            'id' => (string) Str::uuid(),
                            'organization_id' => $event->organization_id,
                            'event_id' => $event->id,
                            'module_id' => $moduleId,
                            'status' => 'enabled',
                            'source' => 'migration-inventory-default',
                            'enabled_at' => $now,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-inventory-default')->delete();
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('suppliers');
    }
};
