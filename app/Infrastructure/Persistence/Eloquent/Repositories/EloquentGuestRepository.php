<?php

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Wedding\Entities\Guest;
use App\Domain\Wedding\Repositories\GuestRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use Illuminate\Support\Str;

class EloquentGuestRepository implements GuestRepositoryInterface
{
    public function find(string $id): ?Guest
    {
        $m = GuestModel::find($id);

        return $m ? $this->toDomain($m) : null;
    }

    public function save(Guest $guest): void
    {
        GuestModel::updateOrCreate(
            ['id' => $guest->id ?? (string) Str::uuid()],
            [
                'wedding_id' => $guest->weddingId,
                'first_name' => $guest->firstName,
                'last_name' => $guest->lastName,
                'email' => $guest->email,
                'phone' => $guest->phone,
                'status' => $guest->status,
                'role' => $guest->role,
                'companions' => $guest->companions,
                'dietary_restrictions' => $guest->dietaryRestrictions,
                'qr_code' => $guest->qrCode,
                'invitation_link' => $guest->invitationLink,
                'rsvp_message' => $guest->rsvpMessage,
                'table_id' => $guest->tableId,
                'drink_preference' => $guest->drinkPreference,
                'menu_preferences' => $guest->menuPreferences,
            ]
        );
    }

    public function delete(string $id): void
    {
        GuestModel::destroy($id);
    }

    public function filter(array $criteria): array
    {
        $query = GuestModel::query();
        foreach ($criteria as $key => $value) {
            $query->where($key, $value);
        }

        return $query->get()->map(fn ($m) => $this->toDomain($m))->all();
    }

    private function toDomain(GuestModel $m): Guest
    {
        return new Guest(
            id: $m->id,
            weddingId: $m->wedding_id,
            firstName: $m->first_name,
            lastName: $m->last_name,
            email: $m->email,
            phone: $m->phone,
            status: $m->status,
            role: $m->role,
            companions: $m->companions,
            dietaryRestrictions: $m->dietary_restrictions,
            qrCode: $m->qr_code,
            invitationLink: $m->invitation_link,
            rsvpMessage: $m->rsvp_message,
            tableId: $m->table_id,
            drinkPreference: $m->drink_preference,
            menuPreferences: $m->menu_preferences,
        );
    }
}
