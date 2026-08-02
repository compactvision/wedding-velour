<?php

namespace App\Http\Controllers\Api;

use App\Application\Billing\EventPricingService;
use App\Application\Billing\PaymentService;
use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\PricingQuote;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantBillingController extends Controller
{
    public function index(
        Organization $organization,
        Event $event,
        EventPricingService $pricing,
    ): JsonResponse {
        $this->authorizeBilling($event, 'billing.view');
        $quotes = PricingQuote::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->with('plan')
            ->latest()
            ->limit(10)
            ->get();
        $payments = Payment::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->with(['quote.plan', 'subscription'])
            ->latest()
            ->limit(10)
            ->get();
        $subscription = Subscription::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->where('active_marker', true)
            ->with('plan')
            ->first();
        $invoices = Invoice::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->latest('issued_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'metrics' => $pricing->metrics($event),
                'plans' => $pricing->catalog($event),
                'quotes' => $quotes->map(fn (PricingQuote $quote) => $this->quoteData($quote)),
                'payments' => $payments->map(fn (Payment $payment) => $this->paymentData($payment)),
                'subscription' => $subscription ? [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'plan_name' => $subscription->plan->name,
                    'starts_at' => $subscription->starts_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                ] : null,
                'invoices' => $invoices->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'status' => $invoice->status,
                    'currency' => $invoice->currency,
                    'total_minor' => $invoice->total_minor,
                    'issued_at' => $invoice->issued_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function quote(
        Request $request,
        Organization $organization,
        Event $event,
        EventPricingService $pricing,
    ): JsonResponse {
        $this->authorizeBilling($event, 'billing.manage');
        $data = $request->validate([
            'plan_slug' => ['required', 'string', 'max:100'],
        ]);
        $plan = Plan::query()
            ->where('slug', $data['plan_slug'])
            ->where('status', 'active')
            ->firstOrFail();
        $quote = $pricing->quote($event, $plan, $request->user());

        return response()->json([
            'data' => $this->quoteData($quote),
        ], Response::HTTP_CREATED);
    }

    public function payment(
        Request $request,
        Organization $organization,
        Event $event,
        PaymentService $payments,
    ): JsonResponse {
        $this->authorizeBilling($event, 'payments.create');
        $data = $request->validate([
            'quote_id' => ['required', 'uuid'],
            'idempotency_key' => ['required', 'string', 'min:16', 'max:100'],
            'provider' => ['sometimes', 'string', 'max:80'],
        ]);
        $quote = PricingQuote::query()
            ->where('organization_id', $organization->id)
            ->where('event_id', $event->id)
            ->findOrFail($data['quote_id']);
        $payment = $payments->create(
            $event,
            $quote,
            $request->user(),
            $data['idempotency_key'],
            $data['provider'] ?? config('payments.default_provider'),
        );

        return response()->json([
            'data' => $this->paymentData($payment),
        ], $payment->wasRecentlyCreated ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    private function authorizeBilling(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function quoteData(PricingQuote $quote): array
    {
        return [
            'id' => $quote->id,
            'plan' => [
                'slug' => $quote->plan->slug,
                'name' => $quote->plan->name,
            ],
            'currency' => $quote->currency,
            'subtotal_minor' => $quote->subtotal_minor,
            'discount_minor' => $quote->discount_minor,
            'tax_minor' => $quote->tax_minor,
            'total_minor' => $quote->total_minor,
            'inputs' => $quote->inputs,
            'lines' => $quote->lines,
            'engine_version' => $quote->engine_version,
            'expires_at' => $quote->expires_at?->toIso8601String(),
            'status' => $quote->status,
            'created_at' => $quote->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentData(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'quote_id' => $payment->pricing_quote_id,
            'plan_name' => $payment->quote?->plan?->name,
            'amount_minor' => $payment->amount_minor,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'provider' => $payment->provider,
            'external_reference' => $payment->external_reference,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }
}
