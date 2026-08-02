<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\WeddingTable;

interface WeddingTableRepositoryInterface
{
    public function find(string $id): ?WeddingTable;

    public function save(WeddingTable $table): void;

    public function delete(string $id): void;

    public function filter(array $criteria): array;
}
