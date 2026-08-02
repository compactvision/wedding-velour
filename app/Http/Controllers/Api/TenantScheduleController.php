<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScheduleItemResource;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Models\Event;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TenantScheduleController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeSchedule($event, 'schedule.view');
        $items = TimelineEventModel::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->with('event:id,timezone')
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->orderBy('sort_order')
            ->orderBy('time')
            ->get();

        return response()->json([
            'data' => [
                'items' => ScheduleItemResource::collection($items),
                'summary' => [
                    'total' => $items->count(),
                    'upcoming' => $items->where('status', 'upcoming')->count(),
                    'in_progress' => $items->where('status', 'in_progress')->count(),
                    'completed' => $items->where('status', 'completed')->count(),
                    'public' => $items->where('visibility', 'public')->count(),
                ],
            ],
        ]);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeSchedule($event, 'schedule.update');
        $data = $this->validatedItem($request, $event);
        $data = $this->normalizeDates($data);
        $item = TimelineEventModel::query()->create([
            ...$data,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => $event->legacy_wedding_id,
            'time' => CarbonImmutable::parse($data['starts_at'], 'UTC')
                ->setTimezone($event->timezone)
                ->format('H:i'),
        ]);

        return (new ScheduleItemResource($item->load('event:id,timezone')))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        TimelineEventModel $scheduleItem,
    ): ScheduleItemResource {
        $this->authorizeSchedule($event, 'schedule.update');
        $this->assertItemScope($scheduleItem, $organization, $event);
        $data = $this->validatedItem($request, $event, true);
        $data = $this->normalizeDates($data);
        if (isset($data['starts_at'])) {
            $data['time'] = CarbonImmutable::parse($data['starts_at'], 'UTC')
                ->setTimezone($event->timezone)
                ->format('H:i');
        }
        $scheduleItem->fill($data)->save();

        return new ScheduleItemResource(
            $scheduleItem->fresh()->load('event:id,timezone'),
        );
    }

    public function destroy(
        Organization $organization,
        Event $event,
        TimelineEventModel $scheduleItem,
    ): Response {
        $this->authorizeSchedule($event, 'schedule.update');
        $this->assertItemScope($scheduleItem, $organization, $event);
        $scheduleItem->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedItem(
        Request $request,
        Event $event,
        bool $partial = false,
    ): array {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$presence, 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'starts_at' => [$presence, 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after:starts_at'],
            'category' => [
                $presence,
                Rule::in([
                    'ceremony',
                    'reception',
                    'dinner',
                    'dance',
                    'speech',
                    'activity',
                    'session',
                    'break',
                    'logistics',
                    'other',
                ]),
            ],
            'status' => ['sometimes', Rule::in(['upcoming', 'in_progress', 'completed'])],
            'location' => ['sometimes', 'nullable', 'string', 'max:180'],
            'responsible_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'visibility' => ['sometimes', Rule::in(['public', 'internal'])],
            'notify_all' => ['sometimes', 'boolean'],
            'image_url' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'sub_details' => ['sometimes', 'nullable', 'array', 'max:50'],
            'sub_details.*' => ['string', 'max:300'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeDates(array $data): array
    {
        foreach (['starts_at', 'ends_at'] as $field) {
            if (! empty($data[$field])) {
                $data[$field] = CarbonImmutable::parse($data[$field])
                    ->utc()
                    ->format('Y-m-d H:i:s');
            }
        }

        return $data;
    }

    private function authorizeSchedule(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'schedule')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Programme n’est pas activé pour cet événement.',
        );
    }

    private function assertItemScope(
        TimelineEventModel $scheduleItem,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $scheduleItem->organization_id === $organization->id
            && $scheduleItem->event_id === $event->id,
            404,
        );
    }
}
