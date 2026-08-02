<?php

namespace App\Http\Controllers\Api;

use App\Application\Budget\BudgetSummaryService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetCategory;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TenantBudgetController extends Controller
{
    public function index(
        Request $request,
        Organization $organization,
        Event $event,
        BudgetSummaryService $summary,
    ): JsonResponse {
        $this->authorizeBudget($event, 'budget.view');
        $budget = Budget::query()->firstOrCreate(
            ['event_id' => $event->id],
            [
                'organization_id' => $organization->id,
                'name' => 'Budget principal',
                'currency' => $organization->currency,
                'status' => 'active',
                'created_by_user_id' => $event->created_by_user_id ?: $request->user()->id,
            ],
        );

        return response()->json(['data' => $summary->forEvent($event, $budget)]);
    }

    public function storeCategory(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeBudget($event, 'budget.manage');
        $budget = $this->budget($event);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'planned_minor' => ['required', 'integer', 'min:0', 'max:999999999999'],
        ]);
        $category = BudgetCategory::query()->create([
            ...$data,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'budget_id' => $budget->id,
            'sort_order' => BudgetCategory::query()
                ->where('budget_id', $budget->id)
                ->max('sort_order') + 1,
        ]);

        return response()->json(['data' => $category], Response::HTTP_CREATED);
    }

    public function updateCategory(
        Request $request,
        Organization $organization,
        Event $event,
        BudgetCategory $category,
    ): JsonResponse {
        $this->authorizeBudget($event, 'budget.manage');
        $this->assertScope($category, $organization, $event);
        $category->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'planned_minor' => ['sometimes', 'integer', 'min:0', 'max:999999999999'],
        ]));

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroyCategory(
        Organization $organization,
        Event $event,
        BudgetCategory $category,
    ): Response {
        $this->authorizeBudget($event, 'budget.manage');
        $this->assertScope($category, $organization, $event);
        $category->delete();

        return response()->noContent();
    }

    public function storeExpense(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeBudget($event, 'budget.manage');
        $budget = $this->budget($event);
        $data = $this->expenseData($request, $event);
        $expense = Expense::query()->create([
            ...$data,
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'budget_id' => $budget->id,
            'currency' => $budget->currency,
            'status' => $data['status'] ?? 'planned',
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $expense], Response::HTTP_CREATED);
    }

    public function updateExpense(
        Request $request,
        Organization $organization,
        Event $event,
        Expense $expense,
    ): JsonResponse {
        $this->authorizeBudget($event, 'budget.manage');
        $this->assertScope($expense, $organization, $event);
        $expense->update($this->expenseData($request, $event, true));

        return response()->json(['data' => $expense->fresh()]);
    }

    public function approveExpense(
        Request $request,
        Organization $organization,
        Event $event,
        Expense $expense,
    ): JsonResponse {
        $this->authorizeBudget($event, 'expenses.approve');
        $this->assertScope($expense, $organization, $event);
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'paid', 'rejected'])],
        ]);
        $expense->update([
            'status' => $data['status'],
            'approved_by_user_id' => $request->user()->id,
            'paid_at' => $data['status'] === 'paid' ? now() : null,
        ]);

        return response()->json(['data' => $expense->fresh()]);
    }

    public function destroyExpense(
        Organization $organization,
        Event $event,
        Expense $expense,
    ): Response {
        $this->authorizeBudget($event, 'budget.manage');
        $this->assertScope($expense, $organization, $event);
        $expense->delete();

        return response()->noContent();
    }

    private function budget(Event $event): Budget
    {
        return Budget::query()->where('event_id', $event->id)->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function expenseData(Request $request, Event $event, bool $partial = false): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'budget_category_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('budget_categories', 'id')->where('event_id', $event->id),
            ],
            'title' => [$presence, 'string', 'max:180'],
            'vendor_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'amount_minor' => [$presence, 'integer', 'min:1', 'max:999999999999'],
            'status' => ['sometimes', Rule::in(['planned', 'pending'])],
            'incurred_on' => ['sometimes', 'nullable', 'date'],
            'due_on' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
        ]);
    }

    private function authorizeBudget(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', 'budget')
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            'Le module Budget n’est pas activé pour cet événement.',
        );
    }

    private function assertScope(
        BudgetCategory|Expense $model,
        Organization $organization,
        Event $event,
    ): void {
        abort_unless(
            $model->organization_id === $organization->id
            && $model->event_id === $event->id,
            404,
        );
    }
}
