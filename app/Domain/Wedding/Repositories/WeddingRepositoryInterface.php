<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\Wedding;

interface WeddingRepositoryInterface
{
    public function find(string $id): ?Wedding;

    public function save(Wedding $wedding): void;

    public function delete(string $id): void;

    public function all(): array;
}
