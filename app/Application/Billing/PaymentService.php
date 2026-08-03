<?php

namespace App\Application\Billing;

use App\Models\Event;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\PaymentWebhookEvent;
use App\Models\PricingQuote;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(private readonly RdcardGateway $rdcard) {}

    public function create(
        Event $event,
        PricingQuote $quote,
        User $user,
        string $idempotencyKey,
        string $provider,
    ): Payment {
        abort_unless(
            $quote->organization_id === $event->organization_id
            && $quote->event_id === $event->id,
            404,
        );
        if ($quote->status !== 'active' || $quote->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'quote_id' => 'Ce devis a expiré. Générez un nouveau devis.',
            ]);
        }

        $existing = Payment::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing) {
            abort_unless(
                $existing->organization_id === $event->organization_id
                && $existing->event_id === $event->id
                && $existing->pricing_quote_id === $quote->id,
                409,
                'Cette clé d’idempotence est déjà utilisée.',
            );

            return $existing->load(['quote.plan', 'subscription']);
        }

        if ($provider === 'rdcard') {
            $apiKey = config('payments.rdcard.api_key');
            $secret = config('payments.rdcard.secret');
            if (! is_string($apiKey) || $apiKey === '' || ! is_string($secret) || $secret === '') {
                throw ValidationException::withMessages([
                    'payment' => 'Le paiement RDCARD n’est pas encore configuré.',
                ]);
            }
        }

        $payment = DB::transaction(function () use (
            $event,
            $quote,
            $user,
            $idempotencyKey,
            $provider,
        ) {
            $payment = Payment::query()->create([
                'organization_id' => $event->organization_id,
                'event_id' => $event->id,
                'pricing_quote_id' => $quote->id,
                'created_by_user_id' => $user->id,
                'amount_minor' => $quote->total_minor,
                'currency' => $quote->currency,
                'status' => 'pending',
                'provider' => $provider,
                'external_reference' => 'PLV-'.Str::upper(Str::random(20)),
                'idempotency_key' => $idempotencyKey,
                'metadata' => ['source' => 'billing'],
            ]);
            PaymentAttempt::query()->create([
                'payment_id' => $payment->id,
                'attempt_number' => 1,
                'status' => 'created',
                'provider_request_id' => $payment->external_reference,
            ]);

            return $payment->load(['quote.plan', 'subscription']);
        });

        if ($provider !== 'rdcard') {
            return $payment;
        }

        try {
            $session = $this->rdcard->createSession($payment, $user);
            $payment->update([
                'metadata' => [
                    ...($payment->metadata ?? []),
                    'rdcard_session_id' => $session['id'],
                    'checkout_url' => $session['checkoutUrl'],
                ],
            ]);
            PaymentAttempt::query()
                ->where('payment_id', $payment->id)
                ->latest('attempt_number')
                ->first()
                ?->update([
                    'status' => 'redirect_ready',
                    'provider_request_id' => $session['id'],
                    'normalized_response' => [
                        'id' => $session['id'],
                        'amount' => $session['amount'],
                        'currency' => $session['currency'],
                    ],
                ]);

            $freshPayment = $payment->fresh(['quote.plan', 'subscription']);
            $freshPayment->wasRecentlyCreated = true;

            return $freshPayment;
        } catch (\Throwable $exception) {
            $payment->update(['status' => 'failed']);
            PaymentAttempt::query()
                ->where('payment_id', $payment->id)
                ->latest('attempt_number')
                ->first()
                ?->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                ]);

            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function processWebhook(
        string $provider,
        array $payload,
        string $rawPayload,
    ): Payment {
        $webhook = PaymentWebhookEvent::query()->firstOrCreate(
            [
                'provider' => $provider,
                'external_event_id' => $payload['event_id'],
            ],
            [
                'payload_hash' => hash('sha256', $rawPayload),
                'status' => 'received',
            ],
        );

        if ($webhook->payload_hash !== hash('sha256', $rawPayload)) {
            abort(409, 'Identifiant webhook réutilisé avec un contenu différent.');
        }

        try {
            $payment = DB::transaction(function () use ($provider, $payload, $webhook) {
                $webhook = PaymentWebhookEvent::query()
                    ->lockForUpdate()
                    ->findOrFail($webhook->id);
                $payment = Payment::query()
                    ->where('provider', $provider)
                    ->where('external_reference', $payload['external_reference'])
                    ->with(['quote.plan'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($webhook->status === 'processed') {
                    return $payment->load('subscription');
                }

                if (
                    (int) $payload['amount_minor'] !== $payment->amount_minor
                    || strtoupper($payload['currency']) !== $payment->currency
                ) {
                    throw ValidationException::withMessages([
                        'payment' => 'Le montant ou la devise ne correspond pas au devis.',
                    ]);
                }

                if ($payload['status'] !== 'paid') {
                    if ($payment->status !== 'paid') {
                        $payment->update(['status' => $payload['status']]);
                    }
                    PaymentAttempt::query()
                        ->where('payment_id', $payment->id)
                        ->latest('attempt_number')
                        ->first()
                        ?->update([
                            'status' => $payment->status === 'paid'
                                ? 'succeeded'
                                : $payload['status'],
                            'normalized_response' => $payload,
                        ]);
                    $webhook->update([
                        'status' => 'processed',
                        'processed_at' => now(),
                    ]);

                    return $payment->load('subscription');
                }

                if ($payment->status !== 'paid') {
                    Subscription::query()
                        ->where('event_id', $payment->event_id)
                        ->where('active_marker', true)
                        ->get()
                        ->each(fn (Subscription $subscription) => $subscription->update([
                            'status' => 'replaced',
                            'cancelled_at' => now(),
                            'active_marker' => null,
                        ]));

                    $subscription = Subscription::query()->create([
                        'organization_id' => $payment->organization_id,
                        'event_id' => $payment->event_id,
                        'plan_id' => $payment->quote->plan_id,
                        'status' => 'active',
                        'starts_at' => now(),
                        'ends_at' => now()->addDays(30),
                        'provider' => $provider,
                        'external_reference' => $payment->external_reference,
                        'plan_snapshot' => [
                            'id' => $payment->quote->plan->id,
                            'name' => $payment->quote->plan->name,
                            'slug' => $payment->quote->plan->slug,
                            'version' => $payment->quote->plan_version,
                            'limits' => $payment->quote->plan->limits,
                            'lines' => $payment->quote->lines,
                        ],
                        'active_marker' => true,
                    ]);
                    $payment->update([
                        'subscription_id' => $subscription->id,
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
                    $payment->quote->update(['status' => 'accepted']);
                    $payment->event()->update(['status' => 'active']);
                    Invoice::query()->create([
                        'organization_id' => $payment->organization_id,
                        'event_id' => $payment->event_id,
                        'subscription_id' => $subscription->id,
                        'payment_id' => $payment->id,
                        'number' => 'PLV-'.now()->format('Y').'-'.Str::upper(Str::random(10)),
                        'currency' => $payment->currency,
                        'subtotal_minor' => $payment->quote->subtotal_minor,
                        'discount_minor' => $payment->quote->discount_minor,
                        'tax_minor' => $payment->quote->tax_minor,
                        'total_minor' => $payment->amount_minor,
                        'status' => 'paid',
                        'issued_at' => now(),
                        'paid_at' => now(),
                        'billing_snapshot' => [
                            'organization_id' => $payment->organization_id,
                            'event_id' => $payment->event_id,
                            'plan' => $subscription->plan_snapshot,
                        ],
                    ]);
                    PaymentAttempt::query()
                        ->where('payment_id', $payment->id)
                        ->latest('attempt_number')
                        ->first()
                        ?->update([
                            'status' => 'succeeded',
                            'normalized_response' => $payload,
                        ]);
                }

                $webhook->update([
                    'status' => 'processed',
                    'processed_at' => now(),
                ]);

                return $payment->fresh(['quote.plan', 'subscription']);
            });

            return $payment;
        } catch (\Throwable $exception) {
            $webhook->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'processed_at' => now(),
            ]);

            throw $exception;
        }
    }
}
