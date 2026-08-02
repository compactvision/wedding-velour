<?php

namespace App\Application\Seating;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\Event;
use App\Models\EventSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SeatingService
{
    /**
     * @return array<string, int>
     */
    public function summary(Event $event): array
    {
        $guests = GuestModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->get(['table_id', 'companions']);
        $tables = WeddingTableModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->get(['capacity']);

        $totalPeople = $guests->sum(fn ($guest) => $this->partySize($guest));
        $seatedPeople = $guests
            ->whereNotNull('table_id')
            ->sum(fn ($guest) => $this->partySize($guest));

        return [
            'tables' => $tables->count(),
            'capacity' => $tables->sum('capacity'),
            'people' => $totalPeople,
            'seated_people' => $seatedPeople,
            'unseated_people' => max(0, $totalPeople - $seatedPeople),
        ];
    }

    /**
     * @return array<int, array{x: float, y: float}>
     */
    public function roomPolygon(Event $event): array
    {
        $featureFlags = $event->settings?->feature_flags ?? [];

        return $featureFlags['seating']['room_polygon'] ?? [];
    }

    /**
     * @param  array<int, array{x: float, y: float}>  $polygon
     */
    public function saveRoomPolygon(Event $event, array $polygon): void
    {
        $settings = EventSetting::query()->firstOrNew(['event_id' => $event->id]);
        $featureFlags = $settings->feature_flags ?? [];
        $featureFlags['seating'] = [
            ...($featureFlags['seating'] ?? []),
            'room_polygon' => $polygon,
            'updated_at' => now()->toIso8601String(),
        ];
        $settings->fill([
            'id' => $settings->id ?: (string) Str::uuid(),
            'organization_id' => $event->organization_id,
            'locale' => $settings->locale ?: 'fr',
            'feature_flags' => $featureFlags,
        ])->save();
    }

    public function assign(Event $event, GuestModel $guest, ?WeddingTableModel $table): GuestModel
    {
        return DB::transaction(function () use ($event, $guest, $table) {
            if ($table) {
                $table = WeddingTableModel::query()
                    ->whereKey($table->id)
                    ->lockForUpdate()
                    ->firstOrFail();
                $this->ensureCapacity($event, $guest, $table);
            }

            $guest->update(['table_id' => $table?->id]);

            return $guest->fresh();
        });
    }

    public function ensureCapacity(
        Event $event,
        GuestModel $guest,
        WeddingTableModel $table,
        ?int $companions = null,
    ): void {
        $occupiedSeats = GuestModel::query()
            ->where('organization_id', $event->organization_id)
            ->where('event_id', $event->id)
            ->where('table_id', $table->id)
            ->whereKeyNot($guest->id)
            ->get(['companions'])
            ->sum(fn ($seatedGuest) => $this->partySize($seatedGuest));
        $requiredSeats = 1 + max(0, $companions ?? (int) $guest->companions);

        if (($occupiedSeats + $requiredSeats) > (int) $table->capacity) {
            throw ValidationException::withMessages([
                'table_id' => "Cette table n’a pas assez de places : {$requiredSeats} nécessaires, "
                    .max(0, (int) $table->capacity - $occupiedSeats).' disponibles.',
            ]);
        }
    }

    private function partySize(GuestModel $guest): int
    {
        return 1 + max(0, (int) $guest->companions);
    }
}
