<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PricingRule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlatformPricingController extends Controller
{
    public function show(Request $request): Response
    {
        $this->authorizePlatformAdmin($request);

        return Inertia::render('PricingSettings', [
            'plans' => Plan::query()
                ->where('billing_model', '!=', 'enterprise')
                ->with('rules')
                ->orderBy('sort_order')
                ->get()
                ->map(function (Plan $plan) {
                    $guestRule = $plan->rules->first(fn (PricingRule $rule) => ($rule->condition['metric'] ?? null) === 'estimated_guests');
                    $moduleRule = $plan->rules->first(fn (PricingRule $rule) => ($rule->condition['metric'] ?? null) === 'enabled_modules'
                        && array_key_exists('included_quantity', $rule->condition ?? []));

                    return [
                        'slug' => $plan->slug,
                        'name' => $plan->name,
                        'currency' => $plan->currency,
                        'base_price_minor' => $plan->base_price_minor,
                        'max_guests' => (int) ($plan->limits['max_guests'] ?? 0),
                        'guest_price_minor' => (int) ($guestRule?->amount_minor ?? 0),
                        'included_modules' => (int) ($moduleRule?->condition['included_quantity'] ?? 0),
                        'module_price_minor' => (int) ($moduleRule?->amount_minor ?? 0),
                    ];
                }),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $this->authorizePlatformAdmin($request);
        $data = $request->validate([
            'plans' => ['required', 'array', 'min:1', 'max:10'],
            'plans.*.slug' => ['required', 'string', Rule::exists('plans', 'slug')],
            'plans.*.base_price_minor' => ['required', 'integer', 'min:0', 'max:100000000'],
            'plans.*.max_guests' => ['required', 'integer', 'min:1', 'max:1000000'],
            'plans.*.guest_price_minor' => ['required', 'integer', 'min:0', 'max:1000000'],
            'plans.*.included_modules' => ['required', 'integer', 'min:0', 'max:1000'],
            'plans.*.module_price_minor' => ['required', 'integer', 'min:0', 'max:1000000'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['plans'] as $input) {
                $plan = Plan::query()
                    ->where('slug', $input['slug'])
                    ->where('billing_model', '!=', 'enterprise')
                    ->with('rules')
                    ->firstOrFail();
                $limits = $plan->limits ?? [];
                $limits['max_guests'] = $input['max_guests'];
                $plan->update([
                    'base_price_minor' => $input['base_price_minor'],
                    'limits' => $limits,
                    'version' => $plan->version + 1,
                ]);

                $guestRule = $plan->rules->first(fn (PricingRule $rule) => ($rule->condition['metric'] ?? null) === 'estimated_guests');
                $guestRule?->update(['amount_minor' => $input['guest_price_minor']]);

                $moduleRule = $plan->rules->first(fn (PricingRule $rule) => ($rule->condition['metric'] ?? null) === 'enabled_modules'
                    && array_key_exists('included_quantity', $rule->condition ?? []));
                $moduleRule ??= new PricingRule([
                    'id' => (string) Str::uuid(),
                    'plan_id' => $plan->id,
                    'name' => 'Modules optionnels sélectionnés',
                    'status' => 'active',
                    'operation' => 'per_unit',
                    'unit_name' => 'module',
                    'priority' => 80,
                ]);
                $moduleRule->fill([
                    'condition' => [
                        'metric' => 'enabled_modules',
                        'included_quantity' => $input['included_modules'],
                    ],
                    'amount_minor' => $input['module_price_minor'],
                ])->save();
            }
        });

        return back()->with('success', 'Les règles de tarification ont été mises à jour.');
    }

    private function authorizePlatformAdmin(Request $request): void
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
    }
}
