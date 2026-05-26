<?php

namespace App\Application\Common;

use Illuminate\Contracts\Container\Container;

class CommandBus
{
    public function __construct(private readonly Container $container) {}

    public function dispatch(object $command): mixed
    {
        $handlerClass = str_replace('\\Commands\\', '\\Commands\\', get_class($command)).'Handler';

        /** @var object $handler */
        $handler = $this->container->make($handlerClass);

        return $handler->handle($command);
    }
}
