<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\MenuItem;

interface MenuItemRepositoryInterface
{
    public function find(string $id): ?MenuItem;
    public function save(MenuItem $item): void;
    public function delete(string $id): void;
    public function filter(array $criteria): array;
}
