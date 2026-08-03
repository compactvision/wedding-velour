<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach (DB::table('plans')->where('billing_model', '!=', 'enterprise')->get() as $plan) {
            $rules = DB::table('pricing_rules')->where('plan_id', $plan->id)->get();
            $guestRule = $rules->first(fn ($rule) => $this->metric($rule) === 'estimated_guests');
            if ($guestRule) {
                DB::table('pricing_rules')->where('id', $guestRule->id)->update([
                    'name' => 'Invités',
                    'condition' => json_encode([
                        'metric' => 'estimated_guests',
                        'included_quantity' => 0,
                    ], JSON_THROW_ON_ERROR),
                    'operation' => 'per_unit',
                    'amount_minor' => 100,
                    'unit_name' => 'invité',
                    'updated_at' => $now,
                ]);
            }

            $moduleRules = $rules->filter(fn ($rule) => $this->metric($rule) === 'enabled_modules');
            $moduleRule = $moduleRules->first(fn ($rule) => array_key_exists(
                'included_quantity',
                json_decode($rule->condition, true) ?? [],
            )) ?? $moduleRules->first();
            if ($moduleRule) {
                DB::table('pricing_rules')->where('id', $moduleRule->id)->update([
                    'name' => 'Modules sélectionnés',
                    'condition' => json_encode([
                        'metric' => 'enabled_modules',
                        'included_quantity' => 0,
                    ], JSON_THROW_ON_ERROR),
                    'operation' => 'per_unit',
                    'unit_name' => 'module',
                    'updated_at' => $now,
                ]);
                DB::table('pricing_rules')
                    ->where('plan_id', $plan->id)
                    ->whereIn('id', $moduleRules->pluck('id')->reject(fn ($id) => $id === $moduleRule->id))
                    ->update(['status' => 'inactive', 'updated_at' => $now]);
            }

            DB::table('pricing_rules')
                ->where('plan_id', $plan->id)
                ->whereIn('id', $rules
                    ->filter(fn ($rule) => $this->metric($rule) === 'team_members')
                    ->pluck('id'))
                ->update(['status' => 'inactive', 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        // Les anciens devis restent immuables. Les tarifs actifs ne sont pas
        // restaurés afin de ne pas écraser une configuration superadmin récente.
    }

    private function metric(object $rule): ?string
    {
        return (json_decode($rule->condition, true) ?? [])['metric'] ?? null;
    }
};
