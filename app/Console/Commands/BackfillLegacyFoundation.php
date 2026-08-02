<?php

namespace App\Console\Commands;

use App\Application\Migration\LegacyFoundationBackfillService;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BackfillLegacyFoundation extends Command
{
    protected $signature = 'planivo:migration:backfill-foundation
        {owner : UUID du propriétaire de l’organisation}
        {--name=Organisation Planivo historique : Nom de l’organisation}
        {--slug= : Slug de l’organisation}
        {--timezone=Africa/Kinshasa : Fuseau des événements historiques}
        {--country=CD : Code pays ISO-2}
        {--dry-run : Exécute puis annule la transaction}';

    protected $description = 'Crée la fondation multi-tenant à partir des mariages existants';

    public function handle(LegacyFoundationBackfillService $backfill): int
    {
        $owner = User::query()->find($this->argument('owner'));
        if (! $owner) {
            $this->error('Le propriétaire demandé est introuvable.');

            return self::FAILURE;
        }

        $name = (string) $this->option('name');
        $slug = (string) ($this->option('slug') ?: Str::slug($name));
        if ($slug === '') {
            $this->error('Le slug de l’organisation est invalide.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        if ($dryRun) {
            DB::beginTransaction();
        }

        try {
            $run = $backfill->run(
                owner: $owner,
                organizationName: $name,
                organizationSlug: $slug,
                timezone: (string) $this->option('timezone'),
                countryCode: $this->option('country') ?: null,
            );

            $this->info("Migration {$run->id} terminée avec le statut {$run->status}.");
            $this->line(json_encode($run->target_counts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            if ($dryRun) {
                DB::rollBack();
                $this->warn('Simulation terminée : aucune modification conservée.');
            }
        } catch (\Throwable $exception) {
            if ($dryRun && DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
