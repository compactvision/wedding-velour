<?php

namespace App\Application\Billing;

use App\Models\Event;
use App\Models\Plan;
use App\Models\PricingQuote;
use App\Models\PricingRule;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class EventPricingService
{
    public const ENGINE_VERSION = 'planivo-pricing-v2';

    /**
     * @return array<string, int>
     */
    public function metrics(Event $event): array
    {
        return [
            'estimated_guests' => max(0, (int) $event->estimated_guests),
            'team_members' => $event->members()->where('status', 'active')->count(),
            'enabled_modules' => $event->enabledModules()
                ->wherePivot('status', 'enabled')
                ->count(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function catalog(Event $event): Collection
    {
        $metrics = $this->metrics($event);

        return Plan::query()
            ->where('status', 'active')
            ->where(fn ($query) => $query
                ->whereNull('valid_from')
                ->orWhere('valid_from', '<=', now()))
            ->where(fn ($query) => $query
                ->whereNull('valid_until')
                ->orWhere('valid_until', '>', now()))
            ->with('features')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Plan $plan) use ($event, $metrics) {
                $calculation = $plan->billing_model === 'enterprise'
                    ? null
                    : $this->calculateForType($event->event_type_id, $plan, $metrics);

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'description' => $plan->description,
                    'billing_model' => $plan->billing_model,
                    'currency' => $plan->currency,
                    'base_price_minor' => $plan->base_price_minor,
                    'limits' => $plan->limits ?? [],
                    'features' => $plan->features->mapWithKeys(
                        fn ($feature) => [
                            $feature->feature_key => match ($feature->value_type) {
                                'boolean' => $feature->boolean_value,
                                'number' => $feature->numeric_value,
                                default => $feature->text_value,
                            },
                        ],
                    ),
                    'estimated_total_minor' => $calculation['total_minor'] ?? null,
                    'estimated_lines' => $calculation['lines'] ?? [],
                ];
            });
    }

    public function quote(Event $event, Plan $plan, User $user): PricingQuote
    {
        if ($plan->status !== 'active' || $plan->billing_model === 'enterprise') {
            throw ValidationException::withMessages([
                'plan_slug' => 'Ce plan nécessite une offre personnalisée.',
            ]);
        }

        $metrics = $this->metrics($event);
        $calculation = $this->calculateForType($event->event_type_id, $plan, $metrics);
        $snapshot = [
            'organization_id' => $event->organization_id,
            'event_id' => $event->id,
            'plan_id' => $plan->id,
            'plan_version' => $plan->version,
            'currency' => $plan->currency,
            'inputs' => $metrics,
            'lines' => $calculation['lines'],
            'subtotal_minor' => $calculation['subtotal_minor'],
            'discount_minor' => 0,
            'tax_minor' => 0,
            'total_minor' => $calculation['total_minor'],
            'engine_version' => self::ENGINE_VERSION,
        ];

        return PricingQuote::query()->create([
            ...$snapshot,
            'created_by_user_id' => $user->id,
            'integrity_hash' => hash_hmac(
                'sha256',
                json_encode($snapshot, JSON_THROW_ON_ERROR),
                (string) config('app.key', 'planivo'),
            ),
            'expires_at' => now()->addMinutes(30),
            'status' => 'active',
        ])->load('plan');
    }

    /**
     * @param  array<string, int>  $metrics
     * @return array{subtotal_minor: int, total_minor: int, lines: array<int, array<string, mixed>>}
     */
    public function calculateForType(string $eventTypeId, Plan $plan, array $metrics): array
    {
        $lines = [[
            'key' => 'base',
            'label' => "Forfait {$plan->name}",
            'quantity' => 1,
            'unit_amount_minor' => $plan->base_price_minor,
            'amount_minor' => $plan->base_price_minor,
        ]];
        $subtotal = (int) $plan->base_price_minor;
        $rules = PricingRule::query()
            ->where('status', 'active')
            ->where(fn ($query) => $query
                ->whereNull('plan_id')
                ->orWhere('plan_id', $plan->id))
            ->where(fn ($query) => $query
                ->whereNull('event_type_id')
                ->orWhere('event_type_id', $eventTypeId))
            ->where(fn ($query) => $query
                ->whereNull('valid_from')
                ->orWhere('valid_from', '<=', now()))
            ->where(fn ($query) => $query
                ->whereNull('valid_until')
                ->orWhere('valid_until', '>', now()))
            ->orderBy('priority')
            ->get();

        foreach (['estimated_guests', 'enabled_modules'] as $metric) {
            $rule = $rules
                ->filter(fn (PricingRule $candidate) => ($candidate->condition['metric'] ?? null) === $metric)
                ->sortByDesc(fn (PricingRule $candidate) => ($candidate->plan_id ? 4 : 0)
                    + ($candidate->event_type_id ? 2 : 0)
                    + ($metric === 'enabled_modules'
                        && array_key_exists('included_quantity', $candidate->condition ?? []) ? 1 : 0))
                ->first();
            if (! $rule) {
                continue;
            }

            $quantity = max(0, (int) ($metrics[$metric] ?? 0));
            $amount = $quantity * (int) $rule->amount_minor;
            $lines[] = [
                'key' => $metric,
                'label' => $metric === 'estimated_guests'
                    ? 'Invités'
                    : 'Modules sélectionnés',
                'quantity' => $quantity,
                'unit' => $metric === 'estimated_guests' ? 'invité' : 'module',
                'unit_amount_minor' => (int) $rule->amount_minor,
                'amount_minor' => $amount,
            ];
            $subtotal += $amount;
        }

        return [
            'subtotal_minor' => $subtotal,
            'total_minor' => $subtotal,
            'lines' => $lines,
        ];
    }
}
