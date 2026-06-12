<?php

namespace App\Http\Controllers\Api;

use App\Domain\Wedding\Entities\Guest;
use App\Domain\Wedding\Entities\MenuItem;
use App\Domain\Wedding\Entities\Order;
use App\Domain\Wedding\Entities\Photo;
use App\Domain\Wedding\Entities\TimelineEvent;
use App\Domain\Wedding\Entities\Wedding;
use App\Domain\Wedding\Entities\WeddingNotification;
use App\Domain\Wedding\Entities\WeddingTable;
use App\Domain\Wedding\Repositories\GuestRepositoryInterface;
use App\Domain\Wedding\Repositories\MenuItemRepositoryInterface;
use App\Domain\Wedding\Repositories\OrderRepositoryInterface;
use App\Domain\Wedding\Repositories\PhotoRepositoryInterface;
use App\Domain\Wedding\Repositories\TimelineEventRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingNotificationRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingRepositoryInterface;
use App\Domain\Wedding\Repositories\WeddingTableRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use ReflectionClass;

class EntityController extends Controller
{
    private const MAP = [
        'wedding' => [
            'interface' => WeddingRepositoryInterface::class,
            'entity' => Wedding::class,
        ],
        'weddingtable' => [
            'interface' => WeddingTableRepositoryInterface::class,
            'entity' => WeddingTable::class,
        ],
        'guest' => [
            'interface' => GuestRepositoryInterface::class,
            'entity' => Guest::class,
        ],
        'menuitem' => [
            'interface' => MenuItemRepositoryInterface::class,
            'entity' => MenuItem::class,
        ],
        'order' => [
            'interface' => OrderRepositoryInterface::class,
            'entity' => Order::class,
        ],
        'photo' => [
            'interface' => PhotoRepositoryInterface::class,
            'entity' => Photo::class,
        ],
        'timelineevent' => [
            'interface' => TimelineEventRepositoryInterface::class,
            'entity' => TimelineEvent::class,
        ],
        'weddingnotification' => [
            'interface' => WeddingNotificationRepositoryInterface::class,
            'entity' => WeddingNotification::class,
        ],
    ];

    private function getMeta(string $entityName): array
    {
        $key = strtolower(str_replace(['_', '-'], '', $entityName));
        if (! isset(self::MAP[$key])) {
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
        $this->authorizeAccess($request, $entityName, 'read');
        $repo = $this->getRepository($entityName);

        // Handle listing/filtering
        $criteria = [];
        foreach ($request->all() as $k => $v) {
            if ($k !== 'orderBy' && $k !== '_token' && $v !== null && $v !== '') {
                $criteria[$k] = $v;
            }
        }

        $user = $request->user();
        if ($user?->wedding_id && ! $user->isAdmin()) {
            $entityKey = strtolower(str_replace(['_', '-'], '', $entityName));
            if ($entityKey === 'wedding') {
                $criteria['id'] = $user->wedding_id;
            } else {
                $criteria['wedding_id'] = $user->wedding_id;
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
        $this->authorizeAccess(request(), $entityName, 'read');
        $repo = $this->getRepository($entityName);
        $entity = $repo->find($id);
        if (! $entity) {
            abort(404);
        }

        return response()->json($this->serializeEntity($entity));
    }

    public function store(string $entityName, Request $request)
    {
        $this->authorizeAccess($request, $entityName, 'write');
        $repo = $this->getRepository($entityName);
        $meta = $this->getMeta($entityName);
        $entityClass = $meta['entity'];

        $id = (string) Str::uuid();
        $data = $request->all();
        $data['id'] = $id;
        if ($request->user()?->wedding_id && ! $request->user()->isAdmin()) {
            $data['wedding_id'] = $request->user()->wedding_id;
        }

        // Custom validation/business logic
        if (strtolower($entityName) === 'menuitem') {
            // MenuItem available_quantity = remaining_quantity initially
            if (isset($data['available_quantity']) && ! isset($data['remaining_quantity'])) {
                $data['remaining_quantity'] = $data['available_quantity'];
            }
        }

        $entity = $this->deserializeEntity($entityClass, $data);
        $repo->save($entity);

        if (
            strtolower($entityName) === 'guest'
            && ($existingData['status'] ?? null) !== 'confirmed'
            && ($updatedData['status'] ?? null) === 'confirmed'
        ) {
            WeddingNotificationModel::firstOrCreate(
                ['source_key' => "guest-confirmed:{$id}"],
                [
                    'id' => (string) Str::uuid(),
                    'wedding_id' => $updatedData['wedding_id'],
                    'title' => 'Invité arrivé',
                    'message' => trim(($updatedData['first_name'] ?? '').' '.($updatedData['last_name'] ?? '')).' vient d’être enregistré à l’entrée.',
                    'type' => 'info',
                    'target_role' => 'manager',
                    'is_read' => false,
                ],
            );
        }

        $saved = $repo->find($id);

        return response()->json($this->serializeEntity($saved ?: $entity), 201);
    }

    public function update(string $entityName, string $id, Request $request)
    {
        $this->authorizeAccess($request, $entityName, 'write');
        $repo = $this->getRepository($entityName);
        $meta = $this->getMeta($entityName);
        $entityClass = $meta['entity'];

        $existing = $repo->find($id);
        if (! $existing) {
            abort(404);
        }

        // Merge existing values with updated ones
        $existingData = $this->serializeEntity($existing);
        $updatedData = array_merge($existingData, $request->all(), ['id' => $id]);
        if ($request->user()?->wedding_id && ! $request->user()->isAdmin()) {
            abort_if(
                isset($existingData['wedding_id']) && $existingData['wedding_id'] !== $request->user()->wedding_id,
                403
            );
            $updatedData['wedding_id'] = $request->user()->wedding_id;
        }

        $entity = $this->deserializeEntity($entityClass, $updatedData);
        $repo->save($entity);

        $saved = $repo->find($id);

        return response()->json($this->serializeEntity($saved ?: $entity));
    }

    public function destroy(string $entityName, string $id)
    {
        $this->authorizeAccess(request(), $entityName, 'write');
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
        if (! empty($entity->id)) {
            $entityClass = get_class($entity);
            $modelClass = str_replace(
                ['App\\Domain\\Wedding\\Entities\\', 'Domain\\Wedding\\Entities\\'],
                ['App\\Infrastructure\\Persistence\\Eloquent\\', 'Infrastructure\\Persistence\\Eloquent\\'],
                $entityClass
            ).'Model';
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

        if (! $constructor) {
            return new $entityClass;
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
            if ($type && ! $type->isBuiltin()) {
                // If it is a class, do nothing or parse
            } elseif ($type) {
                $typeName = $type->getName();
                if ($typeName === 'bool') {
                    $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                } elseif ($typeName === 'int') {
                    $val = $val !== null ? (int) $val : null;
                } elseif ($typeName === 'float') {
                    $val = $val !== null ? (float) $val : null;
                }
            }

            $args[$name] = $val;
        }

        return $reflection->newInstanceArgs($args);
    }

    private function authorizeAccess(Request $request, string $entityName, string $action): void
    {
        $user = $request->user();
        abort_unless($user && $user->is_active, 403);

        if ($user->isAdmin() || $user->role === 'manager') {
            return;
        }

        $entity = strtolower(str_replace(['_', '-'], '', $entityName));
        $allowed = match ($user->role) {
            'server' => [
                'read' => ['order', 'wedding'],
                'write' => ['order'],
            ],
            'door' => [
                'read' => ['guest', 'weddingtable', 'wedding'],
                'write' => ['guest'],
            ],
            default => ['read' => [], 'write' => []],
        };

        abort_unless(in_array($entity, $allowed[$action], true), 403);
    }
}
