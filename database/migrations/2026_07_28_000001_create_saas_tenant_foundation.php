<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone')->nullable()->index()->after('email');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            $table->string('status')->default('active')->index()->after('is_active');
            $table->string('locale', 10)->default('fr')->after('status');
            $table->string('timezone')->nullable()->after('locale');
            $table->timestamp('last_login_at')->nullable()->after('timezone');
            $table->softDeletes();
        });

        Schema::create('migration_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('environment')->index();
            $table->string('status')->default('pending')->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->uuid('initiated_by')->nullable();
            $table->json('source_counts')->nullable();
            $table->json('target_counts')->nullable();
            $table->string('report_path')->nullable();
            $table->text('error_summary')->nullable();
            $table->timestamps();

            $table->foreign('initiated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('legacy_migration_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('migration_run_id');
            $table->string('source_table');
            $table->uuid('source_id');
            $table->string('target_table');
            $table->uuid('target_id');
            $table->string('source_checksum', 64)->nullable();
            $table->string('target_checksum', 64)->nullable();
            $table->string('status')->default('pending')->index();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->foreign('migration_run_id')->references('id')->on('migration_runs')->cascadeOnDelete();
            $table->unique(
                ['source_table', 'source_id', 'target_table'],
                'legacy_migration_source_target_unique',
            );
        });

        Schema::create('feature_flags', function (Blueprint $table) {
            $table->id();
            $table->string('key');
            $table->string('environment')->default('all');
            $table->boolean('enabled')->default(false);
            $table->json('configuration')->nullable();
            $table->timestamps();

            $table->unique(['key', 'environment']);
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('owner_user_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type')->default('personal')->index();
            $table->string('status')->default('active')->index();
            $table->char('country_code', 2)->nullable();
            $table->char('currency', 3)->default('USD');
            $table->string('timezone')->default('UTC');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('owner_user_id')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('organization_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('user_id');
            $table->string('status')->default('active')->index();
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['organization_id', 'user_id']);
        });

        Schema::create('organization_invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('invited_by_user_id');
            $table->string('email')->nullable()->index();
            $table->string('phone')->nullable()->index();
            $table->string('token_hash', 64)->unique();
            $table->json('proposed_roles')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('expires_at')->index();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('invited_by_user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('module_slug')->nullable()->index();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->string('name');
            $table->string('slug');
            $table->string('scope')->default('event');
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->unique(['organization_id', 'slug', 'scope']);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->uuid('role_id');
            $table->unsignedBigInteger('permission_id');

            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('organization_member_roles', function (Blueprint $table) {
            $table->uuid('organization_member_id');
            $table->uuid('role_id');

            $table->foreign('organization_member_id')->references('id')->on('organization_members')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->primary(['organization_member_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_member_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('organization_invitations');
        Schema::dropIfExists('organization_members');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('feature_flags');
        Schema::dropIfExists('legacy_migration_records');
        Schema::dropIfExists('migration_runs');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['phone']);
            $table->dropIndex(['status']);
            $table->dropColumn([
                'first_name',
                'last_name',
                'phone',
                'phone_verified_at',
                'status',
                'locale',
                'timezone',
                'last_login_at',
                'deleted_at',
            ]);
        });
    }
};
