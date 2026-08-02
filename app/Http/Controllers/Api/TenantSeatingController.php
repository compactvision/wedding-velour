<?php

namespace App\Http\Controllers\Api;

use App\Application\Seating\SeatingService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\GuestResource;
use App\Http\Resources\SeatingTableResource;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantSeatingController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
        SeatingService $seating,
    ): JsonResponse {
        $this->authorizeSeating($event, 'seating.view');
        $event->loadMissing('settings');
        $tables = WeddingTableModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->with(['guests' => fn ($query) => $query
                ->orderBy('last_name')
                ->orderBy('first_name')])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => [
                'tables' => SeatingTableResource::collection($tables),
                'summary' => $seating->summary($event),
                'room_polygon' => $seating->roomPolygon($event),
            ],
        ]);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeSeating($event, 'seating.update');
        $table = WeddingTableModel::query()->create([
            ...$this->validatedTable($request),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => $event->legacy_wedding_id,
        ]);

        return (new SeatingTableResource($table->load('guests')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        WeddingTableModel $table,
    ): SeatingTableResource {
        $this->authorizeSeating($event, 'seating.update');
        $this->assertTableScope($table, $organization, $event);
        $data = $this->validatedTable($request, true);

        if (array_key_exists('capacity', $data)) {
            $occupiedSeats = $table->guests()
                ->get(['companions'])
                ->sum(fn ($guest) => 1 + max(0, (int) $guest->companions));
            if ($data['capacity'] < $occupiedSeats) {
                throw ValidationException::withMessages([
                    'capacity' => "La capacité ne peut pas être inférieure aux {$occupiedSeats} places déjà occupées.",
                ]);
            }
        }

        $table->fill($data)->save();

        return new SeatingTableResource($table->fresh()->load('guests'));
    }

    public function destroy(
        Organization $organization,
        Event $event,
        WeddingTableModel $table,
    ): Response {
        $this->authorizeSeating($event, 'seating.update');
        $this->assertTableScope($table, $organization, $event);

        DB::transaction(function () use ($table) {
            $table->guests()->update(['table_id' => null]);
            $table->delete();
        });

        return response()->noContent();
    }

    public function saveLayout(
        Request $request,
        Organization $organization,
        Event $event,
        SeatingService $seating,
    ): JsonResponse {
        $this->authorizeSeating($event, 'seating.update');
        $data = $request->validate([
            'positions' => ['required', 'array', 'max:500'],
            'positions.*.id' => [
                'required',
                'uuid',
                Rule::exists('wedding_tables', 'id')
                    ->where('organization_id', $organization->id)
                    ->where('event_id', $event->id),
            ],
            'positions.*.x' => ['required', 'numeric', 'between:0,1000'],
            'positions.*.y' => ['required', 'numeric', 'between:0,1000'],
            'room_polygon' => ['required', 'array', 'max:100'],
            'room_polygon.*.x' => ['required', 'numeric', 'between:0,1000'],
            'room_polygon.*.y' => ['required', 'numeric', 'between:0,1000'],
        ]);

        DB::transaction(function () use ($data, $organization, $event, $seating) {
            foreach ($data['positions'] as $position) {
                WeddingTableModel::query()
                    ->where('organization_id', $organization->id)
                    ->where('event_id', $event->id)
                    ->whereKey($position['id'])
                    ->update([
                        'position_x' => $position['x'],
                        'position_y' => $position['y'],
                    ]);
            }
            $seating->saveRoomPolygon($event, $data['room_polygon']);
        });

        return response()->json(['message' => 'Plan de salle enregistré.']);
    }

    public function assign(
        Request $request,
        Organization $organization,
        Event $event,
        GuestModel $guest,
        SeatingService $seating,
    ): GuestResource {
        $this->authorizeSeating($event, 'seating.update');
        abort_unless(
            $guest->organization_id === $organization->id
            && $guest->event_id === $event->id,
            404,
        );
        $data = $request->validate([
            'table_id' => [
                'nullable',
                'uuid',
                Rule::exists('wedding_tables', 'id')
                    ->where('organization_id', $organization->id)
                    ->where('event_id', $event->id),
            ],
        ]);
        $table = isset($data['table_id'])
            ? WeddingTableModel::query()->findOrFail($data['table_id'])
            : null;

        return new GuestResource($seating->assign($event, $guest, $table));
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedTable(Request $request, bool $partial = false): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$presence, 'string', 'max:120'],
            'capacity' => [$presence, 'integer', 'min:1', 'max:1000'],
            'shape' => [$presence, Rule::in(['round', 'rectangular', 'oval'])],
            'category' => ['sometimes', Rule::in(['vip', 'family', 'friends', 'colleagues', 'other'])],
            'assigned_server' => ['sometimes', 'nullable', 'string', 'max:120'],
            'position_x' => ['sometimes', 'numeric', 'between:0,1000'],
            'position_y' => ['sometimes', 'numeric', 'between:0,1000'],
        ]);
    }

    private function authorizeSeating(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'seating')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Tables et placement n’est pas activé pour cet événement.',
        );
    }

    private function assertTableScope(
        WeddingTableModel $table,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $table->organization_id === $organization->id
            && $table->event_id === $event->id,
            404,
        );
    }
}
