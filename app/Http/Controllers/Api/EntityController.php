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
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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
        if ($user && ! $user->isAdmin()) {
            abort_unless($user->wedding_id, 403, 'Aucun événement ne vous est affecté.');
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
        $this->assertEntityWithinLegacyScope(
            request(),
            $entityName,
            $this->serializeEntity($entity),
        );

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
        if (! $request->user()->isAdmin()) {
            abort_unless($request->user()->wedding_id, 403, 'Aucun événement ne vous est affecté.');
            abort_if(
                strtolower(str_replace(['_', '-'], '', $entityName)) === 'wedding',
                403,
                'Seul un administrateur peut créer un événement.',
            );
            $data['wedding_id'] = $request->user()->wedding_id;
        }

        // Custom validation/business logic
        if (strtolower($entityName) === 'menuitem') {
            // MenuItem available_quantity = remaining_quantity initially
            if (isset($data['available_quantity']) && ! isset($data['remaining_quantity'])) {
                $data['remaining_quantity'] = $data['available_quantity'];
            }
        }

        $this->ensureGuestTableCapacity($entityName, $id, $data);

        $entity = $this->deserializeEntity($entityClass, $data);
        $repo->save($entity);

        if (
            strtolower($entityName) === 'guest'
            && ($data['status'] ?? null) === 'confirmed'
        ) {
            WeddingNotificationModel::firstOrCreate(
                ['source_key' => "guest-confirmed:{$id}"],
                [
                    'id' => (string) Str::uuid(),
                    'wedding_id' => $data['wedding_id'],
                    'title' => 'Invité arrivé',
                    'message' => trim(($data['first_name'] ?? '').' '.($data['last_name'] ?? '')).' vient d’être enregistré à l’entrée.',
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
        $this->assertEntityWithinLegacyScope($request, $entityName, $existingData);
        $updatedData = array_merge($existingData, $request->all(), ['id' => $id]);
        if ($request->user()?->wedding_id && ! $request->user()->isAdmin()) {
            abort_if(
                isset($existingData['wedding_id']) && $existingData['wedding_id'] !== $request->user()->wedding_id,
                403
            );
            $updatedData['wedding_id'] = $request->user()->wedding_id;
        }

        $this->ensureGuestTableCapacity($entityName, $id, $updatedData);

        $entity = $this->deserializeEntity($entityClass, $updatedData);
        $repo->save($entity);

        $saved = $repo->find($id);

        return response()->json($this->serializeEntity($saved ?: $entity));
    }

    public function destroy(string $entityName, string $id)
    {
        $request = request();
        $this->authorizeAccess($request, $entityName, 'write');
        $repo = $this->getRepository($entityName);
        $entity = $repo->find($id);
        if (! $entity) {
            abort(404);
        }
        $this->assertEntityWithinLegacyScope(
            $request,
            $entityName,
            $this->serializeEntity($entity),
        );
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

    private function ensureGuestTableCapacity(string $entityName, string $guestId, array $guestData): void
    {
        if (strtolower(str_replace(['_', '-'], '', $entityName)) !== 'guest') {
            return;
        }

        $tableId = $guestData['table_id'] ?? null;
        if (! $tableId) {
            return;
        }

        $table = WeddingTableModel::query()
            ->whereKey($tableId)
            ->where('wedding_id', $guestData['wedding_id'] ?? null)
            ->first();

        if (! $table) {
            throw ValidationException::withMessages([
                'table_id' => 'La table sélectionnée est introuvable pour ce mariage.',
            ]);
        }

        $guestSeats = 1 + max(0, (int) ($guestData['companions'] ?? 0));
        $occupiedSeats = GuestModel::query()
            ->where('wedding_id', $table->wedding_id)
            ->where('table_id', $table->id)
            ->whereKeyNot($guestId)
            ->get()
            ->sum(fn (GuestModel $guest) => 1 + max(0, (int) $guest->companions));

        if (($occupiedSeats + $guestSeats) > (int) $table->capacity) {
            $remainingSeats = max(0, (int) $table->capacity - $occupiedSeats);

            throw ValidationException::withMessages([
                'table_id' => "Cette table n'a plus assez de places: {$guestSeats} place(s) nécessaires, {$remainingSeats} disponible(s).",
            ]);
        }
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

    private function assertEntityWithinLegacyScope(
        Request $request,
        string $entityName,
        array $entityData,
    ): void {
        $user = $request->user();
        if (! $user || $user->isAdmin()) {
            return;
        }

        abort_unless($user->wedding_id, 403, 'Aucun événement ne vous est affecté.');
        $entityKey = strtolower(str_replace(['_', '-'], '', $entityName));
        $entityWeddingId = $entityKey === 'wedding'
            ? ($entityData['id'] ?? null)
            : ($entityData['wedding_id'] ?? null);

        abort_unless(
            (string) $entityWeddingId === (string) $user->wedding_id,
            403,
            'Cette ressource appartient à un autre événement.',
        );
    }
}
