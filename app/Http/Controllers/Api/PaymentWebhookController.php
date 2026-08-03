<?php

namespace App\Http\Controllers\Api;

use App\Application\Billing\PaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PaymentWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        string $provider,
        PaymentService $payments,
    ): JsonResponse {
        $secret = $provider === 'rdcard'
            ? config('payments.rdcard.secret')
            : config('payments.webhook_secret');
        abort_unless(is_string($secret) && $secret !== '', 503, 'Webhook non configuré.');
        $rawPayload = $request->getContent();
        $signature = (string) $request->header(
            $provider === 'rdcard' ? 'X-Signature' : 'X-Planivo-Signature',
        );
        abort_unless(
            $signature !== ''
            && hash_equals(hash_hmac('sha256', $rawPayload, $secret), $signature),
            401,
            'Signature webhook invalide.',
        );

        $incoming = $request->json()->all();
        if ($provider === 'rdcard') {
            $payment = $incoming['data']['payment'] ?? [];
            $incoming = [
                'event_id' => $incoming['id'] ?? null,
                'external_reference' => $payment['transactionId'] ?? null,
                'status' => match ($incoming['type'] ?? null) {
                    'payment.initialized' => 'pending',
                    'payment.succeeded' => 'paid',
                    'payment.failed' => 'failed',
                    'payment.canceled' => 'cancelled',
                    default => null,
                },
                'amount_minor' => $this->rdcardAmountToMinor($payment['amount'] ?? null),
                'currency' => $payment['currency'] ?? null,
            ];
        }
        $payload = Validator::make($incoming, [
            'event_id' => ['required', 'string', 'max:160'],
            'external_reference' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['pending', 'paid', 'failed', 'cancelled'])],
            'amount_minor' => ['required', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
        ])->validate();
        $payment = $payments->processWebhook($provider, $payload, $rawPayload);

        return response()->json([
            'received' => true,
            'payment_id' => $payment->id,
            'status' => $payment->status,
        ]);
    }

    private function rdcardAmountToMinor(mixed $amount): ?int
    {
        if ((! is_int($amount) && ! is_float($amount) && ! is_string($amount))
            || ! is_numeric($amount)) {
            return null;
        }

        return (int) round((float) $amount * 100);
    }
}
