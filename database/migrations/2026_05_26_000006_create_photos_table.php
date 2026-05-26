<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wedding_id');
            $table->string('url');
            $table->string('thumbnail_url')->nullable();
            $table->string('caption')->nullable();
            $table->string('uploaded_by')->nullable();
            $table->string('category')->default('other');
            $table->boolean('is_featured')->default(false);
            $table->timestamps();

            $table->foreign('wedding_id')->references('id')->on('weddings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photos');
    }
};
