<?php

namespace Tests\Feature;

use App\Application\Migration\FoundationCatalogService;
use App\Application\Onboarding\ProvisionEventService;
use App\Models\EventType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantTicketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_confirmation_respects_quota_and_ticket_scan_is_idempotent(): void
    {
        $owner = User::factory()->create(['role' => 'admin', 'is_active' => true, 'status' => 'active']);
        app(FoundationCatalogService::class)->seed();
        $type = EventType::query()->where('slug', 'conference')->firstOrFail();
        $result = app(ProvisionEventService::class)->provision($owner, [
            'organization_name' => 'Tickets', 'organization_type' => 'business', 'event_type_id' => $type->id,
            'event_name' => 'Concert', 'starts_at' => '2027-11-10', 'timezone' => 'Africa/Kinshasa', 'format' => 'physical',
            'venue_name' => '', 'venue_address' => '', 'city' => 'Kinshasa', 'country_code' => 'CD', 'currency' => 'USD',
            'estimated_guests' => 100, 'modules' => ['ticketing'],
        ]);
        $org = $result['organization'];
        $event = $result['event'];
        $url = "/api/organizations/{$org->slug}/events/{$event->slug}/ticketing";
        $typeId = $this->actingAs($owner)->postJson("{$url}/types", ['name' => 'VIP', 'price_minor' => 2500, 'capacity' => 2])
            ->assertCreated()->json('data.id');
        $orderId = $this->actingAs($owner)->postJson("{$url}/orders", [
            'ticket_type_id' => $typeId, 'quantity' => 2, 'buyer_name' => 'Jean', 'buyer_email' => 'jean@test.cd',
        ])->assertCreated()->assertJsonPath('data.total_minor', 5000)->json('data.id');
        $this->actingAs($owner)->putJson("{$url}/orders/{$orderId}/confirm")->assertOk();
        $this->actingAs($owner)->putJson("{$url}/orders/{$orderId}/confirm")->assertOk();
        $token = $this->actingAs($owner)->getJson($url)->assertJsonPath('data.summary.sold', 2)
            ->json('data.orders.0.tickets.0.token');
        $this->actingAs($owner)->postJson("{$url}/scan", ['token' => $token])->assertOk()
            ->assertJsonPath('meta.already_scanned', false);
        $this->actingAs($owner)->postJson("{$url}/scan", ['token' => $token])->assertOk()
            ->assertJsonPath('meta.already_scanned', true);
        $this->actingAs($owner)->postJson("{$url}/orders", [
            'ticket_type_id' => $typeId, 'quantity' => 1, 'buyer_name' => 'Trop',
        ])->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->actingAs($owner)->getJson($url)->assertJsonPath('data.summary.revenue_minor', 5000);
    }
}
