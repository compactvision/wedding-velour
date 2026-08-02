<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class InventoryLegacyData extends Command
{
    protected $signature = 'planivo:migration:inventory {--output= : Chemin privé du rapport JSON}';

    protected $description = 'Inventorie les données historiques avant migration SaaS';

    public function handle(): int
    {
        $tables = [
            'users',
            'weddings',
            'wedding_tables',
            'guests',
            'menu_items',
            'orders',
            'photos',
            'timeline_events',
            'wedding_notifications',
        ];

        $report = [
            'generated_at' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'counts' => collect($tables)
                ->mapWithKeys(fn ($table) => [$table => DB::table($table)->count()])
                ->all(),
            'anomalies' => [
                'users_with_missing_wedding' => DB::table('users')
                    ->whereNotNull('wedding_id')
                    ->whereNotExists(fn ($query) => $query
                        ->selectRaw('1')
                        ->from('weddings')
                        ->whereColumn('weddings.id', 'users.wedding_id'))
                    ->count(),
                'guests_with_missing_wedding' => DB::table('guests')
                    ->whereNotExists(fn ($query) => $query
                        ->selectRaw('1')
                        ->from('weddings')
                        ->whereColumn('weddings.id', 'guests.wedding_id'))
                    ->count(),
                'duplicate_invitation_links' => DB::table('guests')
                    ->whereNotNull('invitation_link')
                    ->select('invitation_link')
                    ->groupBy('invitation_link')
                    ->havingRaw('COUNT(*) > 1')
                    ->get()
                    ->count(),
            ],
        ];

        $output = $this->option('output')
            ?: 'migration-reports/inventory-'.now()->format('Ymd-His').'.json';
        Storage::disk('local')->put(
            $output,
            json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        );

        $this->table(
            ['Table', 'Lignes'],
            collect($report['counts'])->map(fn ($count, $table) => [$table, $count])->values(),
        );
        $this->info("Rapport enregistré sur le disque privé : {$output}");

        return self::SUCCESS;
    }
}
