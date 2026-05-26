<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wedding_id');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('status')->default('invited');
            $table->string('role')->default('guest');
            $table->integer('companions')->default(0);
            $table->text('dietary_restrictions')->nullable();
            $table->string('qr_code')->nullable();
            $table->string('invitation_link')->nullable();
            $table->text('rsvp_message')->nullable();
            $table->string('table_id')->nullable();
            $table->timestamps();

            $table->foreign('wedding_id')->references('id')->on('weddings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guests');
    }
};
