<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use ReflectionClass;

class EntityController extends Controller
{
    private const MAP = [
        'wedding'             => [
            'interface' => \App\Domain\Wedding\Repositories\WeddingRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\Wedding::class,
        ],
        'weddingtable'        => [
            'interface' => \App\Domain\Wedding\Repositories\WeddingTableRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\WeddingTable::class,
        ],
        'guest'               => [
            'interface' => \App\Domain\Wedding\Repositories\GuestRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\Guest::class,
        ],
        'menuitem'            => [
            'interface' => \App\Domain\Wedding\Repositories\MenuItemRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\MenuItem::class,
        ],
        'order'               => [
            'interface' => \App\Domain\Wedding\Repositories\OrderRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\Order::class,
        ],
        'photo'               => [
            'interface' => \App\Domain\Wedding\Repositories\PhotoRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\Photo::class,
        ],
        'timelineevent'       => [
            'interface' => \App\Domain\Wedding\Repositories\TimelineEventRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\TimelineEvent::class,
        ],
        'weddingnotification' => [
            'interface' => \App\Domain\Wedding\Repositories\WeddingNotificationRepositoryInterface::class,
            'entity'    => \App\Domain\Wedding\Entities\WeddingNotification::class,
        ],
    ];

    private function getMeta(string $entityName): array
    {
        $key = strtolower(str_replace(['_', '-'], '', $entityName));
        if (!isset(self::MAP[$key])) {
            abort(404, "Entity {$entityName} not found.");
        }
        return self::MAP[$key];
    }

    private function getRepository(string $entityName)
    {
        return app($this->getMeta($entityName)['interface']);
    }

    public function index(string $entityName, Request $request)
    {
        $repo = $this->getRepository($entityName);
        
        // Handle listing/filtering
        $criteria = [];
        foreach ($request->all() as $k => $v) {
            if ($k !== 'orderBy' && $k !== '_token' && $v !== null && $v !== '') {
                $criteria[$k] = $v;
            }
        }

        if (method_exists($repo, 'filter')) {
            $entities = $repo->filter($criteria);
        } elseif (method_exists($repo, 'all')) {
            $entities = $repo->all();
        } else {
            $entities = [];
        }

        return response()->json(array_map([$this, 'serializeEntity'], $entities));
    }

    public function show(string $entityName, string $id)
    {
        $repo = $this->getRepository($entityName);
        $entity = $repo->find($id);
        if (!$entity) {
            abort(404);
        }
        return response()->json($this->serializeEntity($entity));
    }

    public function store(string $entityName, Request $request)
    {
        $repo = $this->getRepository($entityName);
        $meta = $this->getMeta($entityName);
        $entityClass = $meta['entity'];

        $id = (string) Str::uuid();
        $data = $request->all();
        $data['id'] = $id;

        // Custom validation/business logic
        if (strtolower($entityName) === 'menuitem') {
            // MenuItem available_quantity = remaining_quantity initially
            if (isset($data['available_quantity']) && !isset($data['remaining_quantity'])) {
                $data['remaining_quantity'] = $data['available_quantity'];
            }
        }

        $entity = $this->deserializeEntity($entityClass, $data);
        $repo->save($entity);

        $saved = $repo->find($id);
        return response()->json($this->serializeEntity($saved ?: $entity), 201);
    }

    public function update(string $entityName, string $id, Request $request)
    {
        $repo = $this->getRepository($entityName);
        $meta = $this->getMeta($entityName);
        $entityClass = $meta['entity'];

        $existing = $repo->find($id);
        if (!$existing) {
            abort(404);
        }

        // Merge existing values with updated ones
        $existingData = $this->serializeEntity($existing);
        $updatedData = array_merge($existingData, $request->all(), ['id' => $id]);

        $entity = $this->deserializeEntity($entityClass, $updatedData);
        $repo->save($entity);

        $saved = $repo->find($id);
        return response()->json($this->serializeEntity($saved ?: $entity));
    }

    public function destroy(string $entityName, string $id)
    {
        $repo = $this->getRepository($entityName);
        $repo->delete($id);
        return response()->json(['success' => true]);
    }

    private function serializeEntity(object $entity): array
    {
        $reflection = new ReflectionClass($entity);
        $data = [];
        foreach ($reflection->getProperties() as $prop) {
            $name = $prop->getName();
            $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $name));
            $value = $prop->getValue($entity);
            $data[$snake] = $value;
        }

        // Look up created_at from database to populate created_date
        if (!empty($entity->id)) {
            $entityClass = get_class($entity);
            $modelClass = str_replace(
                ['App\\Domain\\Wedding\\Entities\\', 'Domain\\Wedding\\Entities\\'],
                ['App\\Infrastructure\\Persistence\\Eloquent\\', 'Infrastructure\\Persistence\\Eloquent\\'],
                $entityClass
            ) . 'Model';
            if (class_exists($modelClass)) {
                $model = $modelClass::find($entity->id);
                if ($model && $model->created_at) {
                    $data['created_date'] = $model->created_at->toIso8601String();
                }
            }
        }

        if (empty($data['created_date'])) {
            $data['created_date'] = date('c');
        }

        return $data;
    }

    private function deserializeEntity(string $entityClass, array $data): object
    {
        $reflection = new ReflectionClass($entityClass);
        $constructor = $reflection->getConstructor();
        
        if (!$constructor) {
            return new $entityClass();
        }

        $params = $constructor->getParameters();
        $args = [];

        foreach ($params as $param) {
            $name = $param->getName();
            $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $name));
            
            if (array_key_exists($snake, $data)) {
                $val = $data[$snake];
            } elseif (array_key_exists($name, $data)) {
                $val = $data[$name];
            } else {
                $val = $param->isDefaultValueAvailable() ? $param->getDefaultValue() : null;
            }

            // Type cast
            $type = $param->getType();
            if ($type && !$type->isBuiltin()) {
                // If it is a class, do nothing or parse
            } elseif ($type) {
                $typeName = $type->getName();
                if ($typeName === 'bool') {
                    $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                } elseif ($typeName === 'int') {
                    $val = $val !== null ? (int)$val : null;
                } elseif ($typeName === 'float') {
                    $val = $val !== null ? (float)$val : null;
                }
            }

            $args[$name] = $val;
        }

        return $reflection->newInstanceArgs($args);
    }
}
