<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const PERMISSIONS = [
        'documents.view' => 'Consulter les documents',
        'documents.manage' => 'Ajouter, versionner et supprimer les documents',
        'documents.download' => 'Télécharger les documents privés',
    ];

    public function up(): void
    {
        Schema::create('event_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('title');
            $table->string('category', 80)->default('other')->index();
            $table->string('visibility')->default('team')->index();
            $table->text('description')->nullable();
            $table->string('status')->default('active')->index();
            $table->uuid('created_by_user_id');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['event_id', 'category']);
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_document_id');
            $table->unsignedInteger('version_number');
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->string('checksum_sha256', 64);
            $table->uuid('uploaded_by_user_id');
            $table->timestamps();

            $table->foreign('event_document_id')->references('id')->on('event_documents')->cascadeOnDelete();
            $table->foreign('uploaded_by_user_id')->references('id')->on('users')->restrictOnDelete();
            $table->unique(['event_document_id', 'version_number']);
        });

        $now = now();
        foreach (self::PERMISSIONS as $key => $description) {
            DB::table('permissions')->updateOrInsert(
                ['key' => $key],
                ['module_slug' => 'documents', 'description' => $description, 'created_at' => $now, 'updated_at' => $now],
            );
        }
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('roles')
            ->whereIn('slug', ['organization_admin', 'event_organizer', 'financial_manager', 'vendor_manager', 'document_manager'])
            ->pluck('id')
            ->each(function ($roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
                }
            });

        $moduleId = DB::table('modules')->where('slug', 'documents')->value('id');
        $weddingTypeId = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($moduleId && $weddingTypeId) {
            DB::table('events')->where('event_type_id', $weddingTypeId)->get(['id', 'organization_id'])
                ->each(function ($event) use ($moduleId, $now) {
                    DB::table('event_modules')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'organization_id' => $event->organization_id,
                        'event_id' => $event->id,
                        'module_id' => $moduleId,
                        'status' => 'enabled',
                        'source' => 'migration-documents-default',
                        'enabled_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-documents-default')->delete();
        $permissionIds = DB::table('permissions')->whereIn('key', array_keys(self::PERMISSIONS))->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('event_documents');
    }
};
