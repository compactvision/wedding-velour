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
        $secret = config('payments.webhook_secret');
        abort_unless(is_string($secret) && $secret !== '', 503, 'Webhook non configuré.');
        $rawPayload = $request->getContent();
        $signature = (string) $request->header('X-Planivo-Signature');
        abort_unless(
            $signature !== ''
            && hash_equals(hash_hmac('sha256', $rawPayload, $secret), $signature),
            401,
            'Signature webhook invalide.',
        );

        $payload = Validator::make($request->json()->all(), [
            'event_id' => ['required', 'string', 'max:160'],
            'external_reference' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::in(['paid', 'failed', 'cancelled'])],
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
}
