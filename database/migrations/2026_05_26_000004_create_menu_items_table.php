<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wedding_id');
            $table->string('name');
            $table->string('emoji')->nullable();
            $table->string('category')->default('drink');
            $table->text('description')->nullable();
            $table->integer('available_quantity')->default(0);
            $table->integer('remaining_quantity')->default(0);
            $table->boolean('is_available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('wedding_id')->references('id')->on('weddings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
