<?php

namespace App\Console\Commands;

use App\Application\Communications\CommunicationService;
use Illuminate\Console\Command;

class DispatchScheduledCommunications extends Command
{
    protected $signature = 'communications:dispatch';

    protected $description = 'Publie les communications Planivo arrivées à échéance';

    public function handle(CommunicationService $communications): int
    {
        $count = $communications->dispatchDue();
        $this->info("{$count} communication(s) publiée(s).");

        return self::SUCCESS;
    }
}
