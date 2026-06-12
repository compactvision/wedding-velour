<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
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
        ]);

        $order = OrderModel::create([
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
        ]);

        return response()->json($order, 201);
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
        ]);

        $order = OrderModel::create([
            'id' => (string) Str::uuid(),
            'wedding_id' => $table->wedding_id,
            'table_id' => $table->id,
            'table_name' => $table->name,
            ...$data,
            'status' => 'pending',
            'priority' => 'normal',
        ]);

        return response()->json($order, 201);
    }
}
