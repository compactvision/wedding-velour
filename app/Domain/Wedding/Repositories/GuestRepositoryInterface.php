<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\Guest;

interface GuestRepositoryInterface
{
    public function find(string $id): ?Guest;
    public function save(Guest $guest): void;
    public function delete(string $id): void;
    public function filter(array $criteria): array;
}
