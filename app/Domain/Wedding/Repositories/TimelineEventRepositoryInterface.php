<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\TimelineEvent;

interface TimelineEventRepositoryInterface
{
    public function find(string $id): ?TimelineEvent;

    public function save(TimelineEvent $event): void;

    public function delete(string $id): void;

    public function filter(array $criteria): array;
}
