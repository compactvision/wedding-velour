<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'vendors.view' => ['vendors', 'Consulter les prestataires et contrats'],
        'vendors.manage' => ['vendors', 'Gérer les prestataires'],
        'contracts.manage' => ['contracts', 'Créer et gérer les contrats'],
        'contracts.approve' => ['contracts', 'Approuver, signer et clôturer les contrats'],
    ];

    public function up(): void
    {
        Schema::create('event_vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->string('category', 120);
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('website')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('prospect')->index();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'name']);
            $table->index(['event_id', 'category']);
        });

        Schema::create('vendor_contracts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('event_vendor_id');
            $table->string('reference', 80);
            $table->string('title');
            $table->text('scope')->nullable();
            $table->unsignedBigInteger('value_minor');
            $table->string('currency', 3);
            $table->string('status')->default('draft')->index();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable()->index();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->uuid('created_by_user_id');
            $table->uuid('approved_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('event_vendor_id')->references('id')->on('event_vendors')->restrictOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approved_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['event_id', 'reference']);
        });

        Schema::create('contract_installments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('vendor_contract_id');
            $table->string('label');
            $table->unsignedBigInteger('amount_minor');
            $table->date('due_on')->nullable()->index();
            $table->string('status')->default('pending')->index();
            $table->timestamp('paid_at')->nullable();
            $table->uuid('paid_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('vendor_contract_id')->references('id')->on('vendor_contracts')->cascadeOnDelete();
            $table->foreign('paid_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['vendor_contract_id', 'status']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => [$module, $description]) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => $module,
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        foreach ([
            'vendors' => [
                'name' => 'Prestataires',
                'description' => 'Prestataires, contacts et prestations.',
                'dependencies' => [],
                'sort_order' => 10,
            ],
            'contracts' => [
                'name' => 'Contrats',
                'description' => 'Engagements, échéances et paiements contractuels.',
                'dependencies' => ['vendors'],
                'sort_order' => 11,
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
                            'sort_order' => $slug === 'vendors' ? 10 : 11,
                        ],
                    );
                },
            );
        }

        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')
            ->whereIn('slug', ['organization_admin', 'event_organizer', 'financial_manager', 'vendor_manager'])
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
        $moduleIds = DB::table('modules')->whereIn('slug', ['vendors', 'contracts'])->pluck('id');
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
                            'source' => 'migration-vendors-default',
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
        DB::table('event_modules')->where('source', 'migration-vendors-default')->delete();
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::dropIfExists('contract_installments');
        Schema::dropIfExists('vendor_contracts');
        Schema::dropIfExists('event_vendors');
    }
};
