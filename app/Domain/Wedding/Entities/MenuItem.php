<?php

namespace App\Domain\Wedding\Entities;

class MenuItem
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $name,
        public ?string $emoji = null,
        public string $category = 'drink',
        public ?string $description = null,
        public int $availableQuantity = 0,
        public int $remainingQuantity = 0,
        public bool $isAvailable = true,
        public int $sortOrder = 0
    ) {}
}
