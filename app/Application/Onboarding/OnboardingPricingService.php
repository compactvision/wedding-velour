<?php

namespace App\Application\Onboarding;

use App\Application\Billing\EventPricingService;
use App\Models\EventModuleDefinition;
use App\Models\EventType;
use App\Models\Plan;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class OnboardingPricingService
{
    public function __construct(private readonly EventPricingService $pricing) {}

    /**
     * @param  list<string>  $selectedModules
     * @return array<string, mixed>
     */
    public function preview(
        EventType $eventType,
        int $estimatedGuests,
        array $selectedModules,
    ): array {
        $resolvedModules = $this->resolveModules($eventType, $selectedModules);
        $metrics = [
            'estimated_guests' => max(0, $estimatedGuests),
            'team_members' => 1,
            'enabled_modules' => $resolvedModules->count(),
        ];
        $plans = Plan::query()
            ->where('status', 'active')
            ->where('billing_model', '!=', 'enterprise')
            ->where(fn ($query) => $query
                ->whereNull('valid_from')
                ->orWhere('valid_from', '<=', now()))
            ->where(fn ($query) => $query
                ->whereNull('valid_until')
                ->orWhere('valid_until', '>', now()))
            ->orderBy('sort_order')
            ->get();

        $plan = $plans->first(fn (Plan $candidate) => $estimatedGuests <= (int) ($candidate->limits['max_guests'] ?? 0)
            && $metrics['enabled_modules'] <= (int) ($candidate->limits['max_modules'] ?? 0))
            ?: $plans->last();
        if (! $plan) {
            throw ValidationException::withMessages([
                'pricing' => 'Aucune offre tarifaire active n’est disponible.',
            ]);
        }

        $calculation = $this->pricing->calculateForType($eventType->id, $plan, $metrics);
        $canonical = $this->canonical(
            $eventType->id,
            $estimatedGuests,
            $selectedModules,
            $plan->slug,
            $calculation['total_minor'],
        );

        return [
            'plan' => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'description' => $plan->description,
            ],
            'currency' => $plan->currency,
            'subtotal_minor' => $calculation['subtotal_minor'],
            'total_minor' => $calculation['total_minor'],
            'lines' => $calculation['lines'],
            'metrics' => $metrics,
            'resolved_modules' => $resolvedModules->pluck('slug')->values(),
            'signature' => hash_hmac('sha256', $canonical, (string) config('app.key', 'planivo')),
        ];
    }

    /**
     * @param  list<string>  $selectedModules
     * @return array<string, mixed>
     */
    public function verify(
        EventType $eventType,
        int $estimatedGuests,
        array $selectedModules,
        string $signature,
    ): array {
        $preview = $this->preview($eventType, $estimatedGuests, $selectedModules);
        if (! hash_equals($preview['signature'], $signature)) {
            throw ValidationException::withMessages([
                'pricing_signature' => 'Le devis a changé. Veuillez recalculer le prix avant de créer l’événement.',
            ]);
        }

        return $preview;
    }

    /**
     * @param  list<string>  $selectedSlugs
     * @return Collection<int, EventModuleDefinition>
     */
    private function resolveModules(EventType $eventType, array $selectedSlugs): Collection
    {
        $eventType->loadMissing('modules');
        $available = $eventType->modules->keyBy('slug');
        $invalid = collect($selectedSlugs)->diff($available->keys());
        if ($invalid->isNotEmpty()) {
            throw ValidationException::withMessages([
                'modules' => 'Un module sélectionné n’est pas disponible pour ce type d’événement.',
            ]);
        }

        $resolved = $eventType->modules
            ->filter(fn ($module) => $module->pivot->default_enabled
                || in_array($module->slug, $selectedSlugs, true))
            ->keyBy('slug');
        $queue = $resolved->values();
        while ($queue->isNotEmpty()) {
            $module = $queue->shift();
            foreach ($module->dependencies ?? [] as $dependencySlug) {
                if ($resolved->has($dependencySlug) || ! $available->has($dependencySlug)) {
                    continue;
                }
                $dependency = $available->get($dependencySlug);
                $resolved->put($dependencySlug, $dependency);
                $queue->push($dependency);
            }
        }

        return $resolved->values();
    }

    /**
     * @param  list<string>  $modules
     */
    private function canonical(
        string $eventTypeId,
        int $estimatedGuests,
        array $modules,
        string $planSlug,
        int $totalMinor,
    ): string {
        sort($modules);

        return json_encode([
            'event_type_id' => $eventTypeId,
            'estimated_guests' => $estimatedGuests,
            'modules' => $modules,
            'plan_slug' => $planSlug,
            'total_minor' => $totalMinor,
        ], JSON_THROW_ON_ERROR);
    }
}
