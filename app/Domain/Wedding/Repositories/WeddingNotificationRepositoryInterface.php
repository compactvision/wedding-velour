<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\WeddingNotification;

interface WeddingNotificationRepositoryInterface
{
    public function find(string $id): ?WeddingNotification;

    public function save(WeddingNotification $notification): void;

    public function delete(string $id): void;

    public function filter(array $criteria): array;
}
