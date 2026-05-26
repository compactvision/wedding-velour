<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timeline_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wedding_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('time');
            $table->string('category')->default('other');
            $table->string('status')->default('upcoming');
            $table->boolean('notify_all')->default(false);
            $table->timestamps();

            $table->foreign('wedding_id')->references('id')->on('weddings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timeline_events');
    }
};
