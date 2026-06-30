<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('weddings', function (Blueprint $table) {
            $table->json('invitation_custom')->nullable()->after('notes');
        });

        Schema::table('timeline_events', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('description');
            $table->json('sub_details')->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('timeline_events', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'sub_details']);
        });

        Schema::table('weddings', function (Blueprint $table) {
            $table->dropColumn('invitation_custom');
        });
    }
};
