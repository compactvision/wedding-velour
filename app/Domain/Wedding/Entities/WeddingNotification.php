<?php

namespace App\Domain\Wedding\Entities;

class WeddingNotification
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $title,
        public string $message,
        public string $type = 'info',
        public string $targetRole = 'all',
        public bool $isRead = false,
        public ?string $targetUser = null
    ) {}
}
