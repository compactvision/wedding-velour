<?php

namespace App\Application\Tenancy;

final readonly class TenantContext
{
    /**
     * @param  list<string>  $permissions
     */
    public function __construct(
        public string $organizationId,
        public string $userId,
        public ?string $eventId,
        public array $permissions,
        public bool $isOwner = false,
    ) {}

    public function allows(string $permission): bool
    {
        return $this->isOwner
            || in_array('*', $this->permissions, true)
            || in_array($permission, $this->permissions, true);
    }
}
