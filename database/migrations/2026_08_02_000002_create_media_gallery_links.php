<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photos', function (Blueprint $table) {
            $table->string('original_name')->nullable()->after('path');
        });

        Schema::create('media_gallery_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('event_id')->unique();
            $table->uuid('created_by_user_id');
            $table->string('token', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('allow_downloads')->default(true);
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('created_by_user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_gallery_links');
        Schema::table('photos', function (Blueprint $table) {
            $table->dropColumn('original_name');
        });
    }
};
