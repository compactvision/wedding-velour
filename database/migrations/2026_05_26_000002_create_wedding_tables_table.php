<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wedding_tables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wedding_id');
            $table->string('name');
            $table->integer('capacity')->default(8);
            $table->double('position_x')->default(0);
            $table->double('position_y')->default(0);
            $table->string('shape')->default('round');
            $table->string('assigned_server')->nullable();
            $table->string('category')->default('other');
            $table->timestamps();

            $table->foreign('wedding_id')->references('id')->on('weddings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wedding_tables');
    }
};
