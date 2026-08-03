<?php

namespace App\Http\Controllers;

use App\Application\Billing\ReceiptPdfService;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class PlatformTransactionController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['pending', 'paid', 'failed', 'cancelled'])],
        ]);
        $search = trim($filters['search'] ?? '');
        $query = Payment::query();
        $filtered = (clone $query)
            ->with(['organization:id,name', 'event:id,name', 'quote.plan:id,name', 'invoice'])
            ->when($filters['status'] ?? null, fn ($builder, $status) => $builder->where('status', $status))
            ->when($search !== '', fn ($builder) => $builder->where(function ($builder) use ($search) {
                $builder->where('external_reference', 'like', "%{$search}%")
                    ->orWhereHas('organization', fn ($relation) => $relation->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('event', fn ($relation) => $relation->where('name', 'like', "%{$search}%"));
            }));
        $paidCount = (clone $query)->where('status', 'paid')->count();
        $finishedCount = (clone $query)->whereIn('status', ['paid', 'failed', 'cancelled'])->count();

        return Inertia::render('SuperAdminTransactions', [
            'stats' => [
                'revenue_minor' => (int) (clone $query)->where('status', 'paid')->sum('amount_minor'),
                'month_revenue_minor' => (int) (clone $query)->where('status', 'paid')
                    ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->sum('amount_minor'),
                'paid_count' => $paidCount,
                'pending_count' => (clone $query)->where('status', 'pending')->count(),
                'success_rate' => $finishedCount > 0 ? round($paidCount * 100 / $finishedCount, 1) : 0,
                'currency' => 'USD',
            ],
            'transactions' => $filtered
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'reference' => $payment->external_reference,
                    'organization' => $payment->organization?->name,
                    'event' => $payment->event?->name,
                    'plan' => $payment->quote?->plan?->name,
                    'amount_minor' => $payment->amount_minor,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'provider' => $payment->provider,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'receipt_url' => $payment->status === 'paid' && $payment->invoice
                        ? route('superadmin.transactions.receipt', $payment)
                        : null,
                ]),
            'filters' => [
                'search' => $search,
                'status' => $filters['status'] ?? '',
            ],
        ]);
    }

    public function receipt(
        Request $request,
        Payment $payment,
        ReceiptPdfService $receipts,
    ): SymfonyResponse {
        abort_unless($request->user()?->isSuperAdmin(), 403);
        abort_unless($payment->status === 'paid', 404);

        return response($receipts->generate($payment), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="recu-'.$payment->external_reference.'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
