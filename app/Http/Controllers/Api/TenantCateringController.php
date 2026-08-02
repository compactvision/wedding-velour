<?php

namespace App\Http\Controllers\Api;

use App\Application\Catering\CateringSummaryService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\CateringMenuItemResource;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Models\Event;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TenantCateringController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
        CateringSummaryService $catering,
    ): JsonResponse {
        $this->authorizeCatering($event, 'catering.view');
        $data = $catering->forEvent($event);

        return response()->json([
            'data' => [
                'menu_items' => CateringMenuItemResource::collection(
                    $data['menu_items'],
                ),
                'summary' => $data['summary'],
                'table_needs' => $data['table_needs'],
            ],
        ]);
    }

    public function store(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeCatering($event, 'catering.manage');
        $data = $this->validatedItem($request);
        $item = MenuItemModel::query()->create([
            ...$data,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'wedding_id' => $event->legacy_wedding_id,
            'remaining_quantity' => $data['available_quantity'] ?? 0,
        ]);

        return (new CateringMenuItemResource($item))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(
        Request $request,
        Organization $organization,
        Event $event,
        MenuItemModel $menuItem,
    ): CateringMenuItemResource {
        $this->authorizeCatering($event, 'catering.manage');
        $this->assertItemScope($menuItem, $organization, $event);
        $data = $this->validatedItem($request, true);

        if (array_key_exists('available_quantity', $data)) {
            $consumed = max(
                0,
                (int) $menuItem->available_quantity
                    - (int) $menuItem->remaining_quantity,
            );
            $data['remaining_quantity'] = $data['available_quantity'] === 0
                ? 0
                : max(0, $data['available_quantity'] - $consumed);
        }

        $menuItem->fill($data)->save();

        return new CateringMenuItemResource($menuItem->fresh());
    }

    public function destroy(
        Organization $organization,
        Event $event,
        MenuItemModel $menuItem,
    ): Response {
        $this->authorizeCatering($event, 'catering.manage');
        $this->assertItemScope($menuItem, $organization, $event);

        DB::transaction(function () use ($event, $menuItem) {
            GuestModel::query()
                ->where('organization_id', $event->organization_id)
                ->where('event_id', $event->id)
                ->get()
                ->each(function (GuestModel $guest) use ($menuItem) {
                    $preferences = collect($guest->menu_preferences ?? [])
                        ->reject(fn ($id) => $id === $menuItem->id)
                        ->values()
                        ->all();
                    if ($preferences !== ($guest->menu_preferences ?? [])) {
                        $guest->update(['menu_preferences' => $preferences]);
                    }
                });
            $menuItem->delete();
        });

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedItem(
        Request $request,
        bool $partial = false,
    ): array {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$presence, 'string', 'max:180'],
            'emoji' => ['sometimes', 'nullable', 'string', 'max:20'],
            'category' => [
                $presence,
                Rule::in([
                    'starter',
                    'food',
                    'main',
                    'dessert',
                    'drink',
                    'special',
                ]),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'available_quantity' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'is_available' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'allergens' => ['sometimes', 'nullable', 'array', 'max:30'],
            'allergens.*' => ['string', 'max:80'],
            'dietary_tags' => ['sometimes', 'nullable', 'array', 'max:30'],
            'dietary_tags.*' => ['string', 'max:80'],
            'unit_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
            'service_period' => [
                'sometimes',
                Rule::in([
                    'welcome',
                    'starter',
                    'main_service',
                    'dessert',
                    'late_service',
                    'continuous',
                ]),
            ],
        ]);
    }

    private function authorizeCatering(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'catering')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Repas et menus n’est pas activé pour cet événement.',
        );
    }

    private function assertItemScope(
        MenuItemModel $menuItem,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $menuItem->organization_id === $organization->id
            && $menuItem->event_id === $event->id,
            404,
        );
    }
}
