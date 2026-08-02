<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_albums', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('visibility')->default('team');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['event_id', 'name']);
        });
        Schema::table('photos', function (Blueprint $table) {
            $table->uuid('media_album_id')->nullable()->after('event_id');
            $table->string('disk')->nullable();
            $table->string('path')->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('visibility')->default('team');
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->foreign('media_album_id')->references('id')->on('media_albums')->nullOnDelete();
        });
        Schema::table('photos', fn (Blueprint $table) => $table->uuid('wedding_id')->nullable()->change());

        $now = now();
        foreach (['media.view' => 'Consulter les médias', 'media.manage' => 'Ajouter et organiser les médias', 'media.publish' => 'Publier les médias'] as $key => $description) {
            DB::table('permissions')->updateOrInsert(['key' => $key], ['module_slug' => 'media', 'description' => $description, 'created_at' => $now, 'updated_at' => $now]);
        }
        $ids = DB::table('permissions')->whereIn('key', ['media.view', 'media.manage', 'media.publish'])->pluck('id');
        DB::table('roles')->whereIn('slug', ['organization_admin', 'event_organizer', 'media_manager'])->pluck('id')->each(function ($roleId) use ($ids) {
            foreach ($ids as $id) {
                DB::table('role_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $id]);
            }
        });
        $modules = DB::table('modules')->whereIn('slug', ['media', 'gallery'])->pluck('id');
        $wedding = DB::table('event_types')->where('slug', 'wedding')->value('id');
        if ($wedding) {
            DB::table('events')->where('event_type_id', $wedding)->get(['id', 'organization_id'])->each(function ($event) use ($modules, $now) {
                foreach ($modules as $module) {
                    DB::table('event_modules')->insertOrIgnore([
                        'id' => (string) Str::uuid(), 'organization_id' => $event->organization_id, 'event_id' => $event->id,
                        'module_id' => $module, 'status' => 'enabled', 'source' => 'migration-gallery-default',
                        'enabled_at' => $now, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            });
        }
    }

    public function down(): void
    {
        DB::table('event_modules')->where('source', 'migration-gallery-default')->delete();
        $ids = DB::table('permissions')->whereIn('key', ['media.view', 'media.manage', 'media.publish'])->pluck('id');
        DB::table('role_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('id', $ids)->delete();
        Schema::table('photos', function (Blueprint $table) {
            $table->dropForeign(['media_album_id']);
            $table->dropColumn(['media_album_id', 'disk', 'path', 'mime_type', 'size_bytes', 'visibility', 'status', 'published_at']);
        });
        Schema::dropIfExists('media_albums');
    }
};
