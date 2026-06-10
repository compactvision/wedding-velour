<?php

namespace App\Domain\Wedding\Entities;

class Guest
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $firstName,
        public string $lastName,
        public ?string $email = null,
        public ?string $phone = null,
        public string $status = 'invited',
        public string $role = 'guest',
        public int $companions = 0,
        public ?string $dietaryRestrictions = null,
        public ?string $qrCode = null,
        public ?string $invitationLink = null,
        public ?string $rsvpMessage = null,
        public ?string $tableId = null,
        public ?string $drinkPreference = null,
        public ?array $menuPreferences = null
    ) {}
}
