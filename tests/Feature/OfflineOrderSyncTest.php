<?php

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OfflineOrderSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_replaying_an_offline_table_order_does_not_duplicate_it(): void
    {
        $wedding = WeddingModel::create([
            'id' => (string) Str::uuid(),
            'title' => 'Mariage test',
            'date' => now()->toDateString(),
        ]);
        $table = WeddingTableModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'name' => 'Table 1',
        ]);
        $offlineUuid = (string) Str::uuid();
        $payload = [
            'offline_uuid' => $offlineUuid,
            'guest_name' => 'Mado',
            'type' => 'drink',
            'description' => 'Jus de gingembre',
        ];

        $this->postJson("/api/public/table-menus/{$table->id}/orders", $payload)->assertCreated();
        $this->postJson("/api/public/table-menus/{$table->id}/orders", $payload)->assertOk();

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('wedding_notifications', 1);
        $this->assertDatabaseHas('orders', ['offline_uuid' => $offlineUuid]);
    }

    public function test_replaying_an_offline_guest_order_does_not_duplicate_it(): void
    {
        $wedding = WeddingModel::create([
            'id' => (string) Str::uuid(),
            'title' => 'Mariage test',
            'date' => now()->toDateString(),
        ]);
        $guest = GuestModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Amina',
            'last_name' => 'K.',
            'invitation_link' => 'offline-guest-token',
        ]);
        $payload = [
            'offline_uuid' => (string) Str::uuid(),
            'type' => 'food',
            'description' => 'Plat végétarien',
        ];

        $this->postJson('/api/public/invitations/offline-guest-token/orders', $payload)->assertCreated();
        $this->postJson('/api/public/invitations/offline-guest-token/orders', $payload)->assertOk();

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', ['guest_id' => $guest->id]);
        $this->assertDatabaseCount('wedding_notifications', 1);
    }
}
