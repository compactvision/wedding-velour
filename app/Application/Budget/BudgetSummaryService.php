<?php

namespace App\Application\Budget;

use App\Models\Budget;
use App\Models\BudgetCategory;
use App\Models\Event;
use App\Models\Expense;

class BudgetSummaryService
{
    /**
     * @return array<string, mixed>
     */
    public function forEvent(Event $event, Budget $budget): array
    {
        $categories = BudgetCategory::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->with(['expenses' => fn ($query) => $query->orderByDesc('created_at')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
        $expenses = Expense::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->with('category')
            ->orderByDesc('created_at')
            ->get();
        $committedStatuses = ['approved', 'paid'];
        $planned = $categories->sum('planned_minor') + $budget->contingency_minor;
        $committed = $expenses->whereIn('status', $committedStatuses)->sum('amount_minor');
        $paid = $expenses->where('status', 'paid')->sum('amount_minor');

        return [
            'budget' => $budget,
            'summary' => [
                'planned_minor' => $planned,
                'committed_minor' => $committed,
                'paid_minor' => $paid,
                'pending_minor' => $expenses->where('status', 'pending')->sum('amount_minor'),
                'remaining_minor' => $planned - $committed,
                'expense_count' => $expenses->count(),
            ],
            'categories' => $categories->map(fn (BudgetCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color,
                'planned_minor' => $category->planned_minor,
                'committed_minor' => $category->expenses
                    ->whereIn('status', $committedStatuses)
                    ->sum('amount_minor'),
                'paid_minor' => $category->expenses
                    ->where('status', 'paid')
                    ->sum('amount_minor'),
                'sort_order' => $category->sort_order,
            ])->values(),
            'expenses' => $expenses->map(fn (Expense $expense) => [
                'id' => $expense->id,
                'budget_category_id' => $expense->budget_category_id,
                'category_name' => $expense->category?->name,
                'title' => $expense->title,
                'vendor_name' => $expense->vendor_name,
                'amount_minor' => $expense->amount_minor,
                'currency' => $expense->currency,
                'status' => $expense->status,
                'incurred_on' => $expense->incurred_on?->format('Y-m-d'),
                'due_on' => $expense->due_on?->format('Y-m-d'),
                'paid_at' => $expense->paid_at?->toIso8601String(),
                'notes' => $expense->notes,
                'created_at' => $expense->created_at?->toIso8601String(),
            ])->values(),
        ];
    }
}
