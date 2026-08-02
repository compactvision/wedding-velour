<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('guests')->whereNull('wedding_id')->exists()) {
            throw new RuntimeException(
                'Le rollback nécessite de rattacher les invités natifs à un mariage historique.',
            );
        }

        Schema::table('guests', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable(false)->change();
        });
    }
};
