<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PricingQuote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TenantPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('payments.webhook_secret', 'test-webhook-secret');
    }

    public function test_payment_creation_is_idempotent_and_ignores_client_amounts(): void
    {
        [$owner, $organization, $event] = $this->createTenant('paiement');
        $quote = $this->createQuote($owner, $organization, $event);
        $url = $this->billingUrl($organization, $event).'/payments';
        $payload = [
            'quote_id' => $quote->id,
            'idempotency_key' => 'payment-idempotency-key-001',
            'provider' => 'sandbox',
            'amount_minor' => 1,
            'currency' => 'XXX',
        ];

        $response = $this->actingAs($owner)->postJson($url, $payload);
        $response
            ->assertCreated()
            ->assertJsonPath('data.amount_minor', $quote->total_minor)
            ->assertJsonPath('data.currency', $quote->currency)
            ->assertJsonPath('data.status', 'pending');
        $paymentId = $response->json('data.id');

        $this->actingAs($owner)
            ->postJson($url, $payload)
            ->assertOk()
            ->assertJsonPath('data.id', $paymentId);

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('payment_attempts', 1);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_rdcard_session_uses_the_server_quote_and_a_signed_exact_body(): void
    {
        [$owner, $organization, $event] = $this->createTenant('rdcard-session');
        $owner->update(['phone' => '+243810000001']);
        $quote = $this->createQuote($owner, $organization, $event);
        config()->set('payments.default_provider', 'rdcard');
        config()->set('payments.rdcard.environment', 'sandbox');
        config()->set('payments.rdcard.base_url', null);
        config()->set('payments.rdcard.api_key', 'rdcard-test-key');
        config()->set('payments.rdcard.secret', 'rdcard-test-secret');
        config()->set('payments.rdcard.service_id', 'planivo');
        Http::fake([
            'https://sandbox.checkout.rdcard.net/api/v1/sessions' => Http::response([
                'id' => 'sess_planivo_001',
                'checkoutUrl' => 'https://checkout.rdcard.net/pay/sess_planivo_001',
                'amount' => $quote->total_minor / 100,
                'currency' => $quote->currency,
            ]),
        ]);

        $response = $this->actingAs($owner)
            ->postJson($this->billingUrl($organization, $event).'/payments', [
                'quote_id' => $quote->id,
                'idempotency_key' => 'rdcard-session-payment-001',
                'amount_minor' => 1,
                'currency' => 'XXX',
            ])
            ->assertCreated()
            ->assertJsonPath('data.amount_minor', $quote->total_minor)
            ->assertJsonPath('data.checkout_url', 'https://checkout.rdcard.net/pay/sess_planivo_001');

        Http::assertSent(function (Request $request) use ($quote, $response) {
            $body = $request->body();
            $payload = json_decode($body, true, flags: JSON_THROW_ON_ERROR);

            return $request->url() === 'https://sandbox.checkout.rdcard.net/api/v1/sessions'
                && $request->hasHeader('X-API-KEY', 'rdcard-test-key')
                && $request->hasHeader(
                    'X-SIGNATURE',
                    hash_hmac('sha256', $body, 'rdcard-test-secret'),
                )
                && $payload['amount'] === $quote->total_minor / 100
                && $payload['currency'] === $quote->currency
                && $payload['customer']['phone'] === '+243810000001'
                && $payload['transactionId'] === $response->json('data.external_reference')
                && $payload['redirectUrl'] === $payload['successUrl']
                && str_contains($payload['successUrl'], '/payments/success?reference=')
                && str_contains($payload['cancelUrl'], '/payments/failed?reference=')
                && str_ends_with($payload['callbackUrl'], '/api/public/payments/webhooks/rdcard')
                && collect($payload['services'])->every(fn (array $service, int $index) => $service['price'] === $quote->lines[$index]['unit_amount_minor'] / 100
                );
        });
        $this->assertDatabaseHas('payment_attempts', [
            'provider_request_id' => 'sess_planivo_001',
            'status' => 'redirect_ready',
        ]);

        $reference = $response->json('data.external_reference');
        $this->actingAs($owner)
            ->get('/payments/success?reference='.$reference)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PaymentSuccess')
                ->where('reference', $reference));
        $this->actingAs($owner)
            ->get('/payments/failed?reference='.$reference)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PaymentFailed')
                ->where('reference', $reference));
    }

    public function test_invalid_webhook_never_activates_a_subscription(): void
    {
        [$owner, $organization, $event] = $this->createTenant('signature');
        $payment = $this->createPayment($owner, $organization, $event);
        $payload = $this->webhookPayload($payment, 'evt-invalid-signature');

        $this->postJson('/api/public/payments/webhooks/sandbox', $payload, [
            'X-Planivo-Signature' => 'invalid',
        ])->assertUnauthorized();

        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertDatabaseCount('subscriptions', 0);
        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_signed_webhook_activates_once_and_generates_an_invoice(): void
    {
        [$owner, $organization, $event] = $this->createTenant('activation');
        $payment = $this->createPayment($owner, $organization, $event);
        $payload = $this->webhookPayload($payment, 'evt-paid-once');

        $this->signedWebhook($payload)
            ->assertOk()
            ->assertJsonPath('status', 'paid');
        $this->signedWebhook($payload)
            ->assertOk()
            ->assertJsonPath('payment_id', $payment->id);

        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('payment_webhook_events', 1);
        $this->assertDatabaseHas('subscriptions', [
            'organization_id' => $organization->id,
            'event_id' => $event->id,
            'status' => 'active',
            'active_marker' => true,
        ]);
        $this->assertDatabaseHas('invoices', [
            'payment_id' => $payment->id,
            'status' => 'paid',
            'total_minor' => $payment->amount_minor,
        ]);

        $this->actingAs($owner)
            ->getJson($this->billingUrl($organization, $event))
            ->assertOk()
            ->assertJsonPath('data.subscription.status', 'active')
            ->assertJsonPath('data.payments.0.status', 'paid')
            ->assertJsonPath('data.invoices.0.status', 'paid');
    }

    public function test_signed_rdcard_webhook_is_normalized_and_processed_once(): void
    {
        [$owner, $organization, $event] = $this->createTenant('rdcard-webhook');
        $event->update(['status' => 'pending_payment']);
        $payment = $this->createPayment($owner, $organization, $event);
        $payment->update(['provider' => 'rdcard']);
        config()->set('payments.rdcard.secret', 'rdcard-webhook-secret');
        $payload = [
            'id' => 'evt_rdcard_paid_once',
            'type' => 'payment.succeeded',
            'data' => [
                'payment' => [
                    'id' => 'pay_rdcard_001',
                    'amount' => $payment->amount_minor / 100,
                    'currency' => $payment->currency,
                    'transactionId' => $payment->external_reference,
                ],
            ],
            'received' => false,
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $raw, 'rdcard-webhook-secret');

        foreach ([1, 2] as $attempt) {
            $this->call('POST', '/api/public/payments/webhooks/rdcard', [], [], [], [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_SIGNATURE' => $signature,
            ], $raw)->assertOk()->assertJsonPath('status', 'paid');
        }

        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('payment_webhook_events', 1);
        $this->assertSame('active', $event->fresh()->status);
    }

    public function test_user_can_list_own_transactions_and_download_a_paid_receipt(): void
    {
        [$owner, $organization, $event] = $this->createTenant('receipts');
        $payment = $this->createPayment($owner, $organization, $event);
        $this->signedWebhook($this->webhookPayload($payment, 'evt-receipt'))
            ->assertOk();
        $url = "/api/organizations/{$organization->slug}/events/{$event->slug}/transactions";

        $listing = $this->actingAs($owner)->getJson($url)
            ->assertOk()
            ->assertJsonPath('data.summary.paid_minor', $payment->amount_minor)
            ->assertJsonPath('data.transactions.0.id', $payment->id);
        $receiptUrl = $listing->json('data.transactions.0.receipt_url');
        $receipt = $this->actingAs($owner)->get($receiptUrl)
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertDownload('recu-'.$payment->external_reference.'.pdf');

        $this->assertStringStartsWith('%PDF-1.4', $receipt->getContent());
    }

    public function test_superadmin_sees_platform_revenue_and_can_download_receipts(): void
    {
        [$owner, $organization, $event] = $this->createTenant('platform-revenue');
        $payment = $this->createPayment($owner, $organization, $event);
        $this->signedWebhook($this->webhookPayload($payment, 'evt-platform-revenue'))
            ->assertOk();
        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->actingAs($superadmin)
            ->get('/superadmin/transactions')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SuperAdminTransactions')
                ->where('stats.revenue_minor', $payment->amount_minor)
                ->where('stats.paid_count', 1)
                ->has('transactions.data', 1)
                ->where('transactions.data.0.organization', $organization->name));

        $this->actingAs($superadmin)
            ->get("/superadmin/transactions/{$payment->id}/receipt")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertDownload('recu-'.$payment->external_reference.'.pdf');
        $this->actingAs($owner)
            ->get('/superadmin/transactions')
            ->assertForbidden();
    }

    public function test_webhook_rejects_amount_mismatch_and_records_failure(): void
    {
        [$owner, $organization, $event] = $this->createTenant('montant');
        $payment = $this->createPayment($owner, $organization, $event);
        $payload = $this->webhookPayload($payment, 'evt-wrong-amount');
        $payload['amount_minor'] = $payment->amount_minor - 1;

        $this->signedWebhook($payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment');

        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertDatabaseHas('payment_webhook_events', [
            'provider' => 'sandbox',
            'external_event_id' => 'evt-wrong-amount',
            'status' => 'failed',
        ]);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_payment_cannot_reference_another_tenant_quote(): void
    {
        [$ownerA, $organizationA, $eventA] = $this->createTenant('pay-a');
        [$ownerB, $organizationB, $eventB] = $this->createTenant('pay-b');
        $quoteA = $this->createQuote($ownerA, $organizationA, $eventA);

        $this->actingAs($ownerB)
            ->postJson($this->billingUrl($organizationB, $eventB).'/payments', [
                'quote_id' => $quoteA->id,
                'idempotency_key' => 'cross-tenant-payment-key',
            ])
            ->assertNotFound();
        $this->assertDatabaseCount('payments', 0);
    }

    /**
     * @return array{User, Organization, Event}
     */
    private function createTenant(string $name): array
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
            'status' => 'active',
        ]);
        app(FoundationCatalogService::class)->seed();
        $eventType = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => $name,
            'organization_type' => 'business',
            'event_type_id' => $eventType->id,
            'event_name' => "Événement {$name}",
            'starts_at' => '2027-11-10',
            'timezone' => 'Africa/Kinshasa',
            'format' => 'physical',
            'venue_name' => 'Centre Planivo',
            'venue_address' => '',
            'city' => 'Kinshasa',
            'country_code' => 'CD',
            'currency' => 'USD',
            'estimated_guests' => 100,
            'modules' => [],
        ]);

        return [$owner, $result['organization'], $result['event']];
    }

    private function createQuote(
        User $owner,
        Organization $organization,
        Event $event,
    ): PricingQuote {
        $id = $this->actingAs($owner)
            ->postJson($this->billingUrl($organization, $event).'/quotes', [
                'plan_slug' => 'standard',
            ])
            ->assertCreated()
            ->json('data.id');

        return PricingQuote::query()->findOrFail($id);
    }

    private function createPayment(
        User $owner,
        Organization $organization,
        Event $event,
    ): Payment {
        $quote = $this->createQuote($owner, $organization, $event);
        $id = $this->actingAs($owner)
            ->postJson($this->billingUrl($organization, $event).'/payments', [
                'quote_id' => $quote->id,
                'idempotency_key' => 'payment-key-'.$quote->id,
                'provider' => 'sandbox',
            ])
            ->assertCreated()
            ->json('data.id');

        return Payment::query()->findOrFail($id);
    }

    /**
     * @return array<string, mixed>
     */
    private function webhookPayload(Payment $payment, string $eventId): array
    {
        return [
            'event_id' => $eventId,
            'external_reference' => $payment->external_reference,
            'status' => 'paid',
            'amount_minor' => $payment->amount_minor,
            'currency' => $payment->currency,
        ];
    }

    private function signedWebhook(array $payload)
    {
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $raw, 'test-webhook-secret');

        return $this->call(
            'POST',
            '/api/public/payments/webhooks/sandbox',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_PLANIVO_SIGNATURE' => $signature,
            ],
            $raw,
        );
    }

    private function billingUrl(Organization $organization, Event $event): string
    {
        return "/api/organizations/{$organization->slug}/events/{$event->slug}/billing";
    }
}
