<?php

namespace App\Domain\Wedding\Entities;

class Wedding
{
    public function __construct(
        public readonly ?string $id,
        public string $title,
        public string $date,
        public ?string $venue = null,
        public ?string $venueAddress = null,
        public ?string $coverImage = null,
        public string $status = 'planning',
        public int $maxGuests = 100,
        public ?string $notes = null,
        public ?array $invitationCustom = null
    ) {}
}
