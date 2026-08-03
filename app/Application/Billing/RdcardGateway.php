<?php

namespace App\Application\Billing;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class RdcardGateway
{
    /**
     * @return array{id: string, checkoutUrl: string, amount: int|float|string, currency: string}
     */
    public function createSession(Payment $payment, User $customer): array
    {
        $apiKey = config('payments.rdcard.api_key');
        $secret = config('payments.rdcard.secret');
        if (! is_string($apiKey) || $apiKey === '' || ! is_string($secret) || $secret === '') {
            throw ValidationException::withMessages([
                'payment' => 'Le paiement RDCARD n’est pas encore configuré.',
            ]);
        }

        $payment->loadMissing('quote.plan');
        $payload = array_filter([
            'amount' => $this->toMajorUnits($payment->amount_minor),
            'currency' => $payment->currency,
            'serviceId' => config('payments.rdcard.service_id'),
            'customer' => array_filter([
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
            ], fn ($value) => is_string($value) && $value !== ''),
            'description' => 'Pack Planivo '.$payment->quote->plan->name,
            'redirectUrl' => route('payments.success', [
                'reference' => $payment->external_reference,
            ]),
            'callbackUrl' => url('/api/public/payments/webhooks/rdcard'),
            'cancelUrl' => route('payments.failed', [
                'reference' => $payment->external_reference,
            ]),
            'successUrl' => route('payments.success', [
                'reference' => $payment->external_reference,
            ]),
            'transactionId' => $payment->external_reference,
            'services' => collect($payment->quote->lines)->map(fn (array $line) => [
                'name' => $line['label'],
                'price' => $this->toMajorUnits((int) $line['unit_amount_minor']),
                'description' => $line['label'],
                'quantity' => (int) $line['quantity'],
            ])->values()->all(),
        ], fn ($value) => $value !== null && $value !== '');
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $environment = (string) config('payments.rdcard.environment', 'sandbox');
        if (! in_array($environment, ['sandbox', 'live'], true)) {
            throw ValidationException::withMessages([
                'payment' => 'PG_ENVIRONMENT doit être défini sur sandbox ou live.',
            ]);
        }
        $configuredBaseUrl = config('payments.rdcard.base_url');
        $baseUrl = is_string($configuredBaseUrl) && $configuredBaseUrl !== ''
            ? $configuredBaseUrl
            : config("payments.rdcard.base_urls.{$environment}");
        if ($environment === 'live') {
            foreach (['redirectUrl', 'callbackUrl', 'cancelUrl', 'successUrl'] as $urlField) {
                if (! str_starts_with((string) $payload[$urlField], 'https://')) {
                    throw ValidationException::withMessages([
                        'payment' => 'En mode live, APP_URL doit utiliser HTTPS pour les retours et webhooks RDCARD.',
                    ]);
                }
            }
        }

        $response = Http::acceptJson()
            ->withBody($body, 'application/json')
            ->withHeaders([
                'X-API-KEY' => $apiKey,
                'X-SIGNATURE' => hash_hmac('sha256', $body, $secret),
            ])
            ->timeout(20)
            ->post(rtrim((string) $baseUrl, '/').'/v1/sessions')
            ->throw();
        $session = $response->json();

        if (! is_string($session['id'] ?? null) || ! is_string($session['checkoutUrl'] ?? null)) {
            throw ValidationException::withMessages([
                'payment' => 'RDCARD a retourné une session de paiement invalide.',
            ]);
        }
        if ($this->toMinorUnits($session['amount'] ?? null) !== $payment->amount_minor
            || strtoupper((string) ($session['currency'] ?? '')) !== $payment->currency) {
            throw ValidationException::withMessages([
                'payment' => 'Le montant retourné par RDCARD ne correspond pas au devis.',
            ]);
        }

        return $session;
    }

    private function toMajorUnits(int $amountMinor): int|float
    {
        $amount = round($amountMinor / 100, 2);

        return floor($amount) === $amount ? (int) $amount : $amount;
    }

    private function toMinorUnits(mixed $amount): ?int
    {
        if (! is_int($amount) && ! is_float($amount) && ! is_string($amount)) {
            return null;
        }
        if (! is_numeric($amount)) {
            return null;
        }

        return (int) round((float) $amount * 100);
    }
}
