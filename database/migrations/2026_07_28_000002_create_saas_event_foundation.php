<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::create('event_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_category_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->uuid('image_media_id')->nullable();
            $table->string('icon')->nullable();
            $table->string('status')->default('active')->index();
            $table->string('primary_color')->nullable();
            $table->json('custom_fields_schema')->nullable();
            $table->json('pricing_metadata')->nullable();
            $table->json('limits')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('event_category_id')->references('id')->on('event_categories')->restrictOnDelete();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('status')->default('active')->index();
            $table->string('category')->nullable()->index();
            $table->json('dependencies')->nullable();
            $table->json('configuration_schema')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('event_type_modules', function (Blueprint $table) {
            $table->uuid('event_type_id');
            $table->uuid('module_id');
            $table->string('recommendation_level')->default('optional');
            $table->boolean('default_enabled')->default(false);
            $table->json('configuration_defaults')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->foreign('event_type_id')->references('id')->on('event_types')->cascadeOnDelete();
            $table->foreign('module_id')->references('id')->on('modules')->cascadeOnDelete();
            $table->primary(['event_type_id', 'module_id']);
        });

        Schema::create('events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_type_id');
            $table->uuid('created_by_user_id');
            $table->string('name');
            $table->string('slug');
            $table->string('status')->default('draft')->index();
            $table->timestampTz('starts_at')->nullable()->index();
            $table->timestampTz('ends_at')->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('format')->default('physical');
            $table->string('venue_name')->nullable();
            $table->text('venue_address')->nullable();
            $table->string('city')->nullable();
            $table->char('country_code', 2)->nullable();
            $table->text('virtual_url')->nullable();
            $table->unsignedInteger('estimated_guests')->default(0);
            $table->string('visibility')->default('invitation');
            $table->string('age_range_type')->nullable();
            $table->unsignedSmallInteger('custom_age_min')->nullable();
            $table->unsignedSmallInteger('custom_age_max')->nullable();
            $table->uuid('cover_media_id')->nullable();
            $table->uuid('legacy_wedding_id')->nullable()->unique();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_type_id')->references('id')->on('event_types')->restrictOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['organization_id', 'slug']);
            $table->index(['organization_id', 'status', 'starts_at']);
        });

        Schema::create('event_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_id');
            $table->uuid('organization_member_id');
            $table->string('status')->default('active')->index();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('organization_member_id')->references('id')->on('organization_members')->cascadeOnDelete();
            $table->unique(['event_id', 'organization_member_id']);
        });

        Schema::create('event_member_roles', function (Blueprint $table) {
            $table->uuid('event_member_id');
            $table->uuid('role_id');

            $table->foreign('event_member_id')->references('id')->on('event_members')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->primary(['event_member_id', 'role_id']);
        });

        Schema::create('event_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('locale', 10)->default('fr');
            $table->json('branding')->nullable();
            $table->json('public_page')->nullable();
            $table->json('privacy')->nullable();
            $table->json('communication')->nullable();
            $table->json('feature_flags')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique('event_id');
        });

        Schema::create('event_modules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('module_id');
            $table->string('status')->default('enabled')->index();
            $table->string('source')->default('onboarding');
            $table->json('configuration')->nullable();
            $table->timestamp('enabled_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('module_id')->references('id')->on('modules')->restrictOnDelete();
            $table->unique(['event_id', 'module_id']);
            $table->index(['organization_id', 'event_id', 'status']);
        });

        Schema::create('event_custom_fields', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('key');
            $table->string('label');
            $table->string('type');
            $table->json('options')->nullable();
            $table->json('validation_rules')->nullable();
            $table->string('visibility')->default('private');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'key']);
        });

        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->uuid('event_custom_field_id');
            $table->string('subject_type');
            $table->uuid('subject_id');
            $table->json('value')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('event_custom_field_id')->references('id')->on('event_custom_fields')->cascadeOnDelete();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('event_custom_fields');
        Schema::dropIfExists('event_modules');
        Schema::dropIfExists('event_settings');
        Schema::dropIfExists('event_member_roles');
        Schema::dropIfExists('event_members');
        Schema::dropIfExists('events');
        Schema::dropIfExists('event_type_modules');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('event_types');
        Schema::dropIfExists('event_categories');
    }
};
