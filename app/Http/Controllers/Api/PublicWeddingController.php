<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicWeddingController extends Controller
{
    public function invitation(string $token): JsonResponse
    {
        $guest = GuestModel::where('invitation_link', $token)->firstOrFail();

        return response()->json([
            'guest' => $guest,
            'wedding' => WeddingModel::findOrFail($guest->wedding_id),
            'timeline' => TimelineEventModel::where('wedding_id', $guest->wedding_id)->orderBy('time')->get(),
            'table' => $guest->table_id ? WeddingTableModel::find($guest->table_id) : null,
            'co_guests' => $guest->table_id
                ? GuestModel::where('table_id', $guest->table_id)->whereKeyNot($guest->id)->get()
                : [],
            'menu_items' => MenuItemModel::where('wedding_id', $guest->wedding_id)->orderBy('sort_order')->get(),
            'orders' => OrderModel::where('guest_id', $guest->id)->latest()->get(),
        ]);
    }

    public function respond(Request $request, string $token): JsonResponse
    {
        $guest = GuestModel::where('invitation_link', $token)->firstOrFail();
        $data = $request->validate([
            'status' => ['required', 'in:attending,confirmed,declined'],
            'rsvp_message' => ['nullable', 'string', 'max:2000'],
            'menu_preferences' => ['nullable', 'array', 'max:5'],
            'menu_preferences.*' => ['uuid'],
        ]);

        $guest->update($data);

        return response()->json($guest->fresh());
    }

    public function invitationOrder(Request $request, string $token): JsonResponse
    {
        $guest = GuestModel::where('invitation_link', $token)->firstOrFail();
        $data = $request->validate([
            'type' => ['required', 'in:drink,food,dessert,special_request'],
            'description' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'offline_uuid' => ['nullable', 'uuid'],
        ]);

        $offlineUuid = $data['offline_uuid'] ?? null;
        $order = $offlineUuid
            ? OrderModel::firstOrCreate(
                ['offline_uuid' => $offlineUuid],
                $this->invitationOrderAttributes($guest, $data)
            )
            : OrderModel::create($this->invitationOrderAttributes($guest, $data));

        $this->notifyNewOrder($order);

        return response()->json($order, $order->wasRecentlyCreated ? 201 : 200);
    }

    public function tableMenu(string $tableId): JsonResponse
    {
        $table = WeddingTableModel::findOrFail($tableId);

        return response()->json([
            'table' => $table,
            'wedding' => WeddingModel::findOrFail($table->wedding_id),
            'menu_items' => MenuItemModel::where('wedding_id', $table->wedding_id)
                ->where('is_available', true)
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function tableOrder(Request $request, string $tableId): JsonResponse
    {
        $table = WeddingTableModel::findOrFail($tableId);
        $data = $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:drink,food,dessert,special_request'],
            'description' => ['required', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'offline_uuid' => ['nullable', 'uuid'],
        ]);

        $offlineUuid = $data['offline_uuid'] ?? null;
        $attributes = [
            'id' => (string) Str::uuid(),
            'wedding_id' => $table->wedding_id,
            'table_id' => $table->id,
            'table_name' => $table->name,
            ...$data,
            'status' => 'pending',
            'priority' => 'normal',
        ];
        $order = $offlineUuid
            ? OrderModel::firstOrCreate(['offline_uuid' => $offlineUuid], $attributes)
            : OrderModel::create($attributes);

        $this->notifyNewOrder($order);

        return response()->json($order, $order->wasRecentlyCreated ? 201 : 200);
    }

    private function invitationOrderAttributes(GuestModel $guest, array $data): array
    {
        return [
            'id' => (string) Str::uuid(),
            'wedding_id' => $guest->wedding_id,
            'table_id' => $guest->table_id,
            'table_name' => $guest->table_id
                ? WeddingTableModel::find($guest->table_id)?->name
                : 'Non assigné',
            'guest_id' => $guest->id,
            'guest_name' => "{$guest->first_name} {$guest->last_name}",
            ...$data,
            'status' => 'pending',
            'priority' => 'normal',
        ];
    }

    private function notifyNewOrder(OrderModel $order): void
    {
        WeddingNotificationModel::firstOrCreate(
            ['source_key' => "order:{$order->id}"],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $order->wedding_id,
                'title' => 'Nouvelle commande',
                'message' => "{$order->guest_name} · {$order->table_name} · {$order->description}",
                'type' => 'order',
                'target_role' => 'server',
                'is_read' => false,
            ],
        );
    }
}
