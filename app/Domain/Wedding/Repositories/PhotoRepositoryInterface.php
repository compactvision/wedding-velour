<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\Photo;

interface PhotoRepositoryInterface
{
    public function find(string $id): ?Photo;
    public function save(Photo $photo): void;
    public function delete(string $id): void;
    public function filter(array $criteria): array;
}
