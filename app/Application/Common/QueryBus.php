<?php

namespace App\Application\Common;

use Illuminate\Contracts\Container\Container;

class QueryBus
{
    public function __construct(private readonly Container $container) {}

    public function ask(object $query): mixed
    {
        $handlerClass = get_class($query).'Handler';

        /** @var object $handler */
        $handler = $this->container->make($handlerClass);

        return $handler->handle($query);
    }
}
