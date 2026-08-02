<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
            $table->json('allergens')->nullable();
            $table->json('dietary_tags')->nullable();
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->string('service_period')->default('main_service')->index();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('wedding_id')->nullable()->change();
            $table->uuid('menu_item_id')->nullable();
            $table->unsignedInteger('quantity')->default(1);

            $table->foreign('menu_item_id')
                ->references('id')
                ->on('menu_items')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (
            DB::table('menu_items')->whereNull('wedding_id')->exists()
            || DB::table('orders')->whereNull('wedding_id')->exists()
        ) {
            throw new RuntimeException(
                'Le rollback nécessite de rattacher les menus et commandes natifs à un mariage historique.',
            );
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['menu_item_id']);
            $table->dropColumn(['menu_item_id', 'quantity']);
            $table->uuid('wedding_id')->nullable(false)->change();
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropIndex(['service_period']);
            $table->dropColumn([
                'allergens',
                'dietary_tags',
                'unit_price',
                'service_period',
            ]);
            $table->uuid('wedding_id')->nullable(false)->change();
        });
    }
};
