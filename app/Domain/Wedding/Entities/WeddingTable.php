<?php

namespace App\Domain\Wedding\Entities;

class WeddingTable
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $name,
        public int $capacity = 8,
        public float $positionX = 0,
        public float $positionY = 0,
        public string $shape = 'round',
        public ?string $assignedServer = null,
        public string $category = 'other'
    ) {}
}
