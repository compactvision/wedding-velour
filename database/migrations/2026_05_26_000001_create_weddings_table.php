<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weddings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->date('date');
            $table->string('venue')->nullable();
            $table->string('venue_address')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('status')->default('planning');
            $table->integer('max_guests')->default(100);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weddings');
    }
};
