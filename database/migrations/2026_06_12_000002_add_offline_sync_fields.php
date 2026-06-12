<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('offline_uuid')->nullable()->unique()->after('id');
        });

        Schema::table('wedding_notifications', function (Blueprint $table) {
            $table->string('source_key')->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('wedding_notifications', function (Blueprint $table) {
            $table->dropUnique(['source_key']);
            $table->dropColumn('source_key');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['offline_uuid']);
            $table->dropColumn('offline_uuid');
        });
    }
};
