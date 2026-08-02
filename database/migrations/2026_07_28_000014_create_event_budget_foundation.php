<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'budget.view' => 'Consulter le budget et les dépenses',
        'budget.manage' => 'Gérer le budget et les dépenses',
        'expenses.approve' => 'Approuver et marquer les dépenses payées',
    ];

    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id')->unique();
            $table->string('name')->default('Budget principal');
            $table->string('currency', 3);
            $table->string('status')->default('active')->index();
            $table->unsignedBigInteger('contingency_minor')->default(0);
            $table->text('notes')->nullable();
            $table->uuid('created_by_user_id');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('budget_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('budget_id');
            $table->string('name');
            $table->string('color', 20)->default('#B98235');
            $table->unsignedBigInteger('planned_minor')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('budget_id')->references('id')->on('budgets')->cascadeOnDelete();
            $table->unique(['budget_id', 'name']);
            $table->index(['event_id', 'sort_order']);
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('budget_id');
            $table->uuid('budget_category_id')->nullable();
            $table->string('title');
            $table->string('vendor_name')->nullable();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3);
            $table->string('status')->default('planned')->index();
            $table->date('incurred_on')->nullable();
            $table->date('due_on')->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by_user_id');
            $table->uuid('approved_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('budget_id')->references('id')->on('budgets')->cascadeOnDelete();
            $table->foreign('budget_category_id')->references('id')->on('budget_categories')->nullOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approved_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['event_id', 'status', 'created_at']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                [
                    'module_slug' => 'budget',
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
            ->whereIn('slug', ['organization_admin', 'event_organizer', 'financial_manager'])
            ->pluck('id')
            ->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                    ]);
                }
            });

        $budgetModuleId = DB::table('modules')->where('slug', 'budget')->value('id');
        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($budgetModuleId && $weddingTypeId) {
            DB::table('event_type_modules')
                ->where('event_type_id', $weddingTypeId)
                ->where('module_id', $budgetModuleId)
                ->update(['default_enabled' => true]);
            DB::table('events')
                ->where('event_type_id', $weddingTypeId)
                ->get(['id', 'organization_id'])
                ->each(function ($event) use ($budgetModuleId, $now) {
                    DB::table('event_modules')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'organization_id' => $event->organization_id,
                        'event_id' => $event->id,
                        'module_id' => $budgetModuleId,
                        'status' => 'enabled',
                        'source' => 'migration-budget-default',
                        'enabled_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-budget-default')->delete();
        $budgetModuleId = DB::table('modules')->where('slug', 'budget')->value('id');
        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($budgetModuleId && $weddingTypeId) {
            DB::table('event_type_modules')
                ->where('event_type_id', $weddingTypeId)
                ->where('module_id', $budgetModuleId)
                ->update(['default_enabled' => false]);
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('key', array_keys(self::PERMISSIONS))
            ->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();

        Schema::dropIfExists('expenses');
        Schema::dropIfExists('budget_categories');
        Schema::dropIfExists('budgets');
    }
};
