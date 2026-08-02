<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'billing.view' => 'Consulter les plans et devis',
        'billing.manage' => 'Créer et gérer les devis',
    ];

    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('status')->default('active')->index();
            $table->string('billing_model')->default('per_event');
            $table->string('currency', 3)->default('USD');
            $table->unsignedBigInteger('base_price_minor')->default(0);
            $table->json('limits')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('plan_features', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('plan_id');
            $table->string('feature_key');
            $table->string('value_type')->default('boolean');
            $table->boolean('boolean_value')->nullable();
            $table->bigInteger('numeric_value')->nullable();
            $table->text('text_value')->nullable();
            $table->json('overage_policy')->nullable();
            $table->timestamps();

            $table->foreign('plan_id')->references('id')->on('plans')->cascadeOnDelete();
            $table->unique(['plan_id', 'feature_key']);
        });

        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('plan_id')->nullable();
            $table->uuid('event_type_id')->nullable();
            $table->uuid('module_id')->nullable();
            $table->string('name');
            $table->string('status')->default('active')->index();
            $table->json('condition');
            $table->string('operation');
            $table->bigInteger('amount_minor')->nullable();
            $table->integer('percentage_basis_points')->nullable();
            $table->string('unit_name')->nullable();
            $table->unsignedInteger('priority')->default(100);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->timestamps();

            $table->foreign('plan_id')->references('id')->on('plans')->cascadeOnDelete();
            $table->foreign('event_type_id')->references('id')->on('event_types')->cascadeOnDelete();
            $table->foreign('module_id')->references('id')->on('modules')->cascadeOnDelete();
            $table->index(['plan_id', 'status', 'priority']);
        });

        Schema::create('pricing_quotes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('plan_id');
            $table->uuid('created_by_user_id');
            $table->string('currency', 3);
            $table->unsignedBigInteger('subtotal_minor');
            $table->unsignedBigInteger('discount_minor')->default(0);
            $table->unsignedBigInteger('tax_minor')->default(0);
            $table->unsignedBigInteger('total_minor');
            $table->json('inputs');
            $table->json('lines');
            $table->unsignedInteger('plan_version');
            $table->string('engine_version');
            $table->string('integrity_hash', 64);
            $table->timestamp('expires_at')->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('plan_id')->references('id')->on('plans')->restrictOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['organization_id', 'event_id', 'created_at']);
        });

        $now = now();
        $plans = [
            'essential' => ['Essentiel', 'Pour les petits événements.', 2900, 100, 2, 6, 2, 0],
            'standard' => ['Standard', 'Pour organiser sereinement un événement moyen.', 7900, 300, 5, 12, 10, 1],
            'premium' => ['Premium', 'Pour les grands événements et les équipes avancées.', 14900, 1000, 15, 30, 50, 2],
            'enterprise' => ['Entreprise', 'Pour les agences et organisations multi-événements.', 0, 1000000, 1000, 1000, 500, 3],
        ];
        foreach ($plans as $slug => [$name, $description, $price, $guests, $users, $modules, $storage, $order]) {
            $planId = (string) Str::uuid();
            DB::table('plans')->insert([
                'id' => $planId,
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'billing_model' => $slug === 'enterprise' ? 'enterprise' : 'per_event',
                'currency' => 'USD',
                'base_price_minor' => $price,
                'limits' => json_encode([
                    'max_guests' => $guests,
                    'max_users' => $users,
                    'max_modules' => $modules,
                    'storage_gb' => $storage,
                ], JSON_THROW_ON_ERROR),
                'version' => 1,
                'valid_from' => $now,
                'sort_order' => $order,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ([
                'max_guests' => $guests,
                'max_users' => $users,
                'max_modules' => $modules,
                'storage_gb' => $storage,
            ] as $feature => $value) {
                DB::table('plan_features')->insert([
                    'id' => (string) Str::uuid(),
                    'plan_id' => $planId,
                    'feature_key' => $feature,
                    'value_type' => 'number',
                    'numeric_value' => $value,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($slug !== 'enterprise') {
                foreach ([
                    ['estimated_guests', 'max_guests', $slug === 'essential' ? 50 : ($slug === 'standard' ? 35 : 20), 'invité'],
                    ['team_members', 'max_users', $slug === 'essential' ? 500 : ($slug === 'standard' ? 400 : 300), 'collaborateur'],
                    ['enabled_modules', 'max_modules', $slug === 'essential' ? 700 : ($slug === 'standard' ? 500 : 300), 'module'],
                ] as [$metric, $limit, $amount, $unit]) {
                    DB::table('pricing_rules')->insert([
                        'id' => (string) Str::uuid(),
                        'plan_id' => $planId,
                        'name' => "Dépassement {$unit}",
                        'condition' => json_encode([
                            'metric' => $metric,
                            'limit_key' => $limit,
                        ], JSON_THROW_ON_ERROR),
                        'operation' => 'per_unit',
                        'amount_minor' => $amount,
                        'unit_name' => $unit,
                        'priority' => 100,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'billing',
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id', 'key');
        foreach (DB::table('roles')->whereIn('slug', ['organization_admin', 'event_organizer'])->get() as $role) {
            $keys = $role->slug === 'organization_admin'
                ? array_keys(self::PERMISSIONS)
                : ['billing.view'];
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

        Schema::dropIfExists('pricing_quotes');
        Schema::dropIfExists('pricing_rules');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('plans');
    }
};
