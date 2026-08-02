<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = [
        'weddings',
        'wedding_tables',
        'guests',
        'menu_items',
        'orders',
        'photos',
        'timeline_events',
        'wedding_notifications',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->uuid('organization_id')->nullable()->index();
                $table->uuid('event_id')->nullable()->index();
                $table->timestamp('migrated_at')->nullable();
                $table->uuid('migration_run_id')->nullable();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->nullOnDelete();
                $table->foreign('event_id')
                    ->references('id')
                    ->on('events')
                    ->nullOnDelete();
                $table->foreign('migration_run_id')
                    ->references('id')
                    ->on('migration_runs')
                    ->nullOnDelete();

                if ($tableName !== 'weddings') {
                    $table->index(['event_id', 'created_at']);
                }
            });
        }
    }

    public function down(): void
    {
        foreach (array_reverse(self::TABLES) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if ($tableName !== 'weddings') {
                    $table->dropIndex([$tableName === 'wedding_notifications' ? 'event_id' : 'event_id', 'created_at']);
                }

                $table->dropForeign([$tableName === 'weddings' ? 'organization_id' : 'organization_id']);
                $table->dropForeign(['event_id']);
                $table->dropForeign(['migration_run_id']);
                $table->dropIndex(['organization_id']);
                $table->dropIndex(['event_id']);
                $table->dropColumn([
                    'organization_id',
                    'event_id',
                    'migrated_at',
                    'migration_run_id',
                ]);
            });
        }
    }
};
