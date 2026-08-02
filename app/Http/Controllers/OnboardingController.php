<?php

namespace App\Http\Controllers;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\OnboardingPricingService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request, FoundationCatalogService $catalog): Response
    {
        $catalog->seed();
        $user = $request->user();

        $organizations = Organization::query()
            ->where('status', 'active')
            ->where(fn ($query) => $query
                ->where('owner_user_id', $user->id)
                ->orWhereHas('members', fn ($members) => $members
                    ->where('user_id', $user->id)
                    ->where('status', 'active')))
            ->with(['events' => fn ($events) => $events
                ->where('status', '!=', 'cancelled')
                ->with(['type', 'enabledModules'])
                ->orderByDesc('starts_at')])
            ->orderBy('name')
            ->get()
            ->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'type' => $organization->type,
                'events' => $organization->events->map(fn (Event $event) => [
                    'id' => $event->id,
                    'name' => $event->name,
                    'slug' => $event->slug,
                    'status' => $event->status,
                    'starts_at' => $event->starts_at?->toIso8601String(),
                    'type' => $event->type?->name,
                    'modules_count' => $event->enabledModules->count(),
                ])->values(),
            ]);

        $eventTypes = EventType::query()
            ->where('status', 'active')
            ->with(['category', 'modules' => fn ($modules) => $modules
                ->where('modules.status', 'active')
                ->orderBy('modules.sort_order')])
            ->orderBy('sort_order')
            ->get()
            ->map(fn (EventType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'slug' => $type->slug,
                'description' => $type->description,
                'icon' => $type->icon,
                'primary_color' => $type->primary_color,
                'category' => $type->category?->name,
                'modules' => $type->modules->map(fn ($module) => [
                    'slug' => $module->slug,
                    'name' => $module->name,
                    'description' => $module->description,
                    'required' => (bool) $module->pivot->default_enabled,
                    'recommendation' => $module->pivot->recommendation_level,
                    'dependencies' => $module->dependencies ?? [],
                ])->values(),
            ]);

        return Inertia::render('Onboarding', [
            'organizations' => $organizations,
            'eventTypes' => $eventTypes,
            'defaults' => [
                'timezone' => $user->timezone ?: config('app.timezone'),
                'country_code' => 'CD',
                'currency' => 'USD',
            ],
        ]);
    }

    public function quote(Request $request, OnboardingPricingService $pricing): JsonResponse
    {
        $data = $request->validate([
            'event_type_id' => [
                'required',
                'uuid',
                Rule::exists('event_types', 'id')->where('status', 'active'),
            ],
            'estimated_guests' => ['required', 'integer', 'min:0', 'max:1000000'],
            'modules' => ['present', 'array'],
            'modules.*' => [
                'string',
                Rule::exists('modules', 'slug')->where('status', 'active'),
            ],
        ]);
        $eventType = EventType::query()->with('modules')->findOrFail($data['event_type_id']);

        return response()->json([
            'data' => $pricing->preview(
                $eventType,
                (int) $data['estimated_guests'],
                $data['modules'],
            ),
        ]);
    }

    public function store(
        Request $request,
        ProvisionEventService $provisioner,
        FoundationCatalogService $catalog,
        OnboardingPricingService $pricing,
    ): RedirectResponse {
        $catalog->seed();

        $data = $request->validate([
            'organization_mode' => ['required', Rule::in(['existing', 'new'])],
            'organization_id' => [
                Rule::requiredIf($request->input('organization_mode') === 'existing'),
                'nullable',
                'uuid',
            ],
            'organization_name' => [
                Rule::requiredIf($request->input('organization_mode') === 'new'),
                'nullable',
                'string',
                'max:120',
            ],
            'organization_type' => ['required', Rule::in(['personal', 'business', 'agency', 'venue'])],
            'event_type_id' => [
                'required',
                'uuid',
                Rule::exists('event_types', 'id')->where('status', 'active'),
            ],
            'event_name' => ['required', 'string', 'max:160'],
            'starts_at' => ['required', 'date'],
            'timezone' => ['required', 'timezone:all'],
            'format' => ['required', Rule::in(['physical', 'virtual', 'hybrid'])],
            'venue_name' => ['nullable', 'string', 'max:160'],
            'venue_address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:120'],
            'country_code' => ['nullable', 'string', 'size:2'],
            'currency' => ['required', 'string', 'size:3'],
            'estimated_guests' => ['required', 'integer', 'min:0', 'max:1000000'],
            'modules' => ['array'],
            'modules.*' => [
                'string',
                Rule::exists('modules', 'slug')->where('status', 'active'),
            ],
            'pricing_signature' => ['required', 'string', 'size:64'],
        ]);
        $eventType = EventType::query()->with('modules')->findOrFail($data['event_type_id']);
        $preview = $pricing->verify(
            $eventType,
            (int) $data['estimated_guests'],
            $data['modules'],
            $data['pricing_signature'],
        );

        $organization = null;
        if ($data['organization_mode'] === 'existing') {
            $organization = Organization::query()
                ->whereKey($data['organization_id'])
                ->where('status', 'active')
                ->where('owner_user_id', $request->user()->id)
                ->firstOrFail();
        }

        $result = $provisioner->provision($request->user(), $data, $organization);
        $settings = $result['event']->settings()->firstOrFail();
        $featureFlags = $settings->feature_flags ?? [];
        $featureFlags['onboarding_pricing'] = [
            'plan' => $preview['plan'],
            'currency' => $preview['currency'],
            'total_minor' => $preview['total_minor'],
            'lines' => $preview['lines'],
            'quoted_at' => now()->toIso8601String(),
        ];
        $settings->update(['feature_flags' => $featureFlags]);
        $this->activate($request, $result['organization'], $result['event']);

        return redirect()->route('workspace')->with(
            'success',
            "L’événement « {$result['event']->name} » est prêt.",
        );
    }

    public function select(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'organization_id' => ['required', 'uuid'],
            'event_id' => ['required', 'uuid'],
        ]);

        $event = $this->accessibleEvent(
            $request,
            $data['organization_id'],
            $data['event_id'],
        )
            ->with('organization')
            ->firstOrFail();

        $this->activate($request, $event->organization, $event);

        return redirect()->route('workspace')->with(
            'success',
            "Espace « {$event->name} » activé.",
        );
    }

    public function workspace(Request $request): Response|RedirectResponse
    {
        $organizationId = $request->session()->get('active_organization_id');
        $eventId = $request->session()->get('active_event_id');

        if (! $organizationId || ! $eventId) {
            return redirect()->route('onboarding');
        }

        $event = $this->accessibleEvent($request, $organizationId, $eventId)
            ->with([
                'organization',
                'type.category',
                'enabledModules' => fn ($modules) => $modules->orderBy('modules.sort_order'),
            ])
            ->first();

        if (! $event) {
            $request->session()->forget(['active_organization_id', 'active_event_id']);

            return redirect()->route('onboarding');
        }

        return Inertia::render('Workspace', [
            'organization' => [
                'id' => $event->organization->id,
                'name' => $event->organization->name,
                'slug' => $event->organization->slug,
            ],
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'status' => $event->status,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'timezone' => $event->timezone,
                'format' => $event->format,
                'venue_name' => $event->venue_name,
                'city' => $event->city,
                'estimated_guests' => $event->estimated_guests,
                'legacy_wedding_id' => $event->legacy_wedding_id,
                'type' => [
                    'name' => $event->type?->name,
                    'category' => $event->type?->category?->name,
                    'color' => $event->type?->primary_color,
                ],
                'modules' => $event->enabledModules->map(fn ($module) => [
                    'slug' => $module->slug,
                    'name' => $module->name,
                    'description' => $module->description,
                ])->values(),
            ],
        ]);
    }

    private function activate(
        Request $request,
        Organization $organization,
        Event $event,
    ): void {
        $request->session()->put([
            'active_organization_id' => $organization->id,
            'active_event_id' => $event->id,
        ]);
    }

    private function accessibleEvent(
        Request $request,
        string $organizationId,
        string $eventId,
    ): Builder {
        return Event::query()
            ->whereKey($eventId)
            ->where('organization_id', $organizationId)
            ->where(fn ($query) => $query
                ->whereHas('organization', fn ($organization) => $organization
                    ->where('owner_user_id', $request->user()->id))
                ->orWhereHas('members.organizationMember', fn ($members) => $members
                    ->where('user_id', $request->user()->id)
                    ->where('status', 'active')));
    }
}
