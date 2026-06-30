<?php

namespace Tests\Feature;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TableCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigning_a_guest_with_companions_requires_enough_table_seats(): void
    {
        $wedding = WeddingModel::create([
            'id' => (string) Str::uuid(),
            'title' => 'Mariage test',
            'date' => '2026-07-12',
            'max_guests' => 50,
        ]);

        $table = WeddingTableModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'name' => 'Table 7',
            'capacity' => 4,
        ]);

        GuestModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Aline',
            'last_name' => 'Mukendi',
            'companions' => 1,
            'table_id' => $table->id,
        ]);

        $guest = GuestModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Jean',
            'last_name' => 'Kabasele',
            'companions' => 2,
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/entities/guest/{$guest->id}", ['table_id' => $table->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('table_id');

        $this->assertDatabaseHas('guests', [
            'id' => $guest->id,
            'table_id' => null,
        ]);
    }

    public function test_updating_companions_on_a_seated_guest_cannot_overfill_the_table(): void
    {
        $wedding = WeddingModel::create([
            'id' => (string) Str::uuid(),
            'title' => 'Mariage test',
            'date' => '2026-07-12',
            'max_guests' => 50,
        ]);

        $table = WeddingTableModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'name' => 'Table famille',
            'capacity' => 3,
        ]);

        GuestModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Sarah',
            'last_name' => 'Mbala',
            'companions' => 1,
            'table_id' => $table->id,
        ]);

        $guest = GuestModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $wedding->id,
            'first_name' => 'Noah',
            'last_name' => 'Ilunga',
            'companions' => 0,
            'table_id' => $table->id,
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/entities/guest/{$guest->id}", ['companions' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('table_id');

        $this->assertDatabaseHas('guests', [
            'id' => $guest->id,
            'companions' => 0,
        ]);
    }
}
