<?php

namespace App\Http\Controllers\Api;

use App\Application\Billing\ReceiptPdfService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class TenantTransactionController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTransactions($event);
        $query = Payment::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id);
        $payments = (clone $query)
            ->with(['quote.plan', 'invoice'])
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'data' => [
                'summary' => [
                    'paid_minor' => (int) (clone $query)->where('status', 'paid')->sum('amount_minor'),
                    'paid_count' => (clone $query)->where('status', 'paid')->count(),
                    'pending_count' => (clone $query)->where('status', 'pending')->count(),
                    'currency' => $payments->first()?->currency ?? 'USD',
                ],
                'transactions' => $payments->map(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'reference' => $payment->external_reference,
                    'plan' => $payment->quote?->plan?->name,
                    'amount_minor' => $payment->amount_minor,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'provider' => $payment->provider,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'receipt_url' => $payment->status === 'paid' && $payment->invoice
                        ? "/api/organizations/{$organization->slug}/events/{$event->slug}/transactions/{$payment->id}/receipt"
                        : null,
                ]),
            ],
        ]);
    }

    public function receipt(
        Organization $organization,
        Event $event,
        Payment $payment,
        ReceiptPdfService $receipts,
    ): Response {
        $this->authorizeTransactions($event);
        abort_unless($payment->organization_id === $organization->id
            && $payment->event_id === $event->id, 404);
        abort_unless($payment->status === 'paid', 404);

        return response($receipts->generate($payment), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="recu-'.$payment->external_reference.'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function authorizeTransactions(Event $event): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows('payments.view'), 403);
    }
}
