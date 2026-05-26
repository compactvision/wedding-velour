<?php

namespace App\Domain\Wedding\Entities;

class TimelineEvent
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $title,
        public ?string $description = null,
        public string $time,
        public string $category = 'other',
        public string $status = 'upcoming',
        public bool $notifyAll = false
    ) {}
}
