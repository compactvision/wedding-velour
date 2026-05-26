<?php

namespace App\Domain\Wedding\Repositories;

use App\Domain\Wedding\Entities\Order;

interface OrderRepositoryInterface
{
    public function find(string $id): ?Order;
    public function save(Order $order): void;
    public function delete(string $id): void;
    public function filter(array $criteria): array;
}
