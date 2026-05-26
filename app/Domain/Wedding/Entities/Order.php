<?php

namespace App\Domain\Wedding\Entities;

class Order
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public ?string $tableId = null,
        public ?string $tableName = null,
        public ?string $guestId = null,
        public ?string $guestName = null,
        public string $type = 'drink',
        public string $description,
        public string $status = 'pending',
        public string $priority = 'normal',
        public ?string $assignedServer = null,
        public ?string $notes = null
    ) {}
}
