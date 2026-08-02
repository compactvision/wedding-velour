<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Ticket;
use App\Models\TicketOrder;
use App\Models\TicketType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantTicketingController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTicketing($event, 'ticketing.view');
        $types = TicketType::query()->where('event_id', $event->id)->orderBy('price_minor')->get();
        $orders = TicketOrder::query()->where('event_id', $event->id)->with('tickets.type')->latest()->get();
        $tickets = $orders->flatMap->tickets;

        return response()->json(['data' => [
            'summary' => [
                'capacity' => $types->sum('capacity'),
                'sold' => $types->sum('sold_count'),
                'revenue_minor' => $orders->where('status', 'confirmed')->sum('total_minor'),
                'scanned' => $tickets->whereNotNull('scanned_at')->count(),
            ],
            'types' => $types,
            'orders' => $orders->map(fn (TicketOrder $order) => [
                'id' => $order->id, 'reference' => $order->reference, 'buyer_name' => $order->buyer_name,
                'total_minor' => $order->total_minor, 'currency' => $order->currency, 'status' => $order->status,
                'ticket_count' => $order->tickets->count(),
                'tickets' => $order->tickets->map(fn (Ticket $ticket) => [
                    'id' => $ticket->id, 'holder_name' => $ticket->holder_name, 'token' => $ticket->token,
                    'type_name' => $ticket->type?->name, 'status' => $ticket->status,
                    'scanned_at' => $ticket->scanned_at?->toIso8601String(),
                ]),
            ]),
        ]]);
    }

    public function storeType(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTicketing($event, 'ticketing.manage');
        $type = TicketType::query()->create([
            ...$request->validate([
                'name' => ['required', 'string', 'max:120'], 'description' => ['nullable', 'string', 'max:1000'],
                'price_minor' => ['required', 'integer', 'min:0'], 'capacity' => ['required', 'integer', 'min:1', 'max:1000000'],
            ]),
            'organization_id' => $organization->id, 'event_id' => $event->id, 'currency' => $organization->currency,
        ]);

        return response()->json(['data' => $type], Response::HTTP_CREATED);
    }

    public function storeOrder(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTicketing($event, 'ticketing.sales');
        $data = $request->validate([
            'ticket_type_id' => ['required', 'uuid', Rule::exists('ticket_types', 'id')->where('event_id', $event->id)],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'buyer_name' => ['required', 'string', 'max:180'], 'buyer_email' => ['nullable', 'email'],
        ]);
        $order = DB::transaction(function () use ($data, $organization, $event, $request) {
            $type = TicketType::query()->lockForUpdate()->findOrFail($data['ticket_type_id']);
            if ($type->sold_count + $data['quantity'] > $type->capacity) {
                throw ValidationException::withMessages(['quantity' => 'Le quota de cette catégorie est dépassé.']);
            }
            $order = TicketOrder::query()->create([
                'organization_id' => $organization->id, 'event_id' => $event->id,
                'reference' => 'BIL-'.strtoupper(Str::random(8)), 'buyer_name' => $data['buyer_name'],
                'buyer_email' => $data['buyer_email'] ?? null, 'total_minor' => $type->price_minor * $data['quantity'],
                'currency' => $organization->currency, 'created_by_user_id' => $request->user()->id,
            ]);
            for ($i = 0; $i < $data['quantity']; $i++) {
                Ticket::query()->create([
                    'organization_id' => $organization->id, 'event_id' => $event->id,
                    'ticket_type_id' => $type->id, 'ticket_order_id' => $order->id,
                    'holder_name' => $data['buyer_name'], 'holder_email' => $data['buyer_email'] ?? null,
                    'token' => hash('sha256', Str::uuid().Str::random(32)), 'status' => 'reserved',
                ]);
            }

            return $order->load('tickets');
        });

        return response()->json(['data' => $order], Response::HTTP_CREATED);
    }

    public function confirm(Request $request, Organization $organization, Event $event, TicketOrder $ticketOrder): JsonResponse
    {
        $this->authorizeTicketing($event, 'ticketing.sales');
        $this->assertScope($ticketOrder, $organization, $event);
        DB::transaction(function () use ($ticketOrder, $request) {
            $order = TicketOrder::query()->lockForUpdate()->findOrFail($ticketOrder->id);
            if ($order->status === 'confirmed') {
                return;
            }
            abort_unless($order->status === 'pending', 422);
            $order->load('tickets');
            foreach ($order->tickets->groupBy('ticket_type_id') as $typeId => $tickets) {
                $type = TicketType::query()->lockForUpdate()->findOrFail($typeId);
                if ($type->sold_count + $tickets->count() > $type->capacity) {
                    throw ValidationException::withMessages(['order' => 'Quota épuisé.']);
                }
                $type->increment('sold_count', $tickets->count());
            }
            $order->tickets()->update(['status' => 'issued']);
            $order->update(['status' => 'confirmed', 'confirmed_at' => now(), 'confirmed_by_user_id' => $request->user()->id]);
        });

        return response()->json(['data' => $ticketOrder->fresh('tickets')]);
    }

    public function scan(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeTicketing($event, 'ticketing.scan');
        $token = $request->validate(['token' => ['required', 'string', 'size:64']])['token'];
        $ticket = Ticket::query()->where('event_id', $event->id)->where('token', $token)->firstOrFail();
        abort_unless($ticket->status === 'issued' || $ticket->status === 'used', 422);
        $already = (bool) $ticket->scanned_at;
        if (! $already) {
            $ticket->update(['status' => 'used', 'scanned_at' => now(), 'scanned_by_user_id' => $request->user()->id]);
        }

        return response()->json(['data' => $ticket->fresh('type'), 'meta' => ['already_scanned' => $already]]);
    }

    private function authorizeTicketing(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id && $context->allows($permission), 403);
        abort_unless($event->enabledModules()->where('modules.slug', 'ticketing')->wherePivot('status', 'enabled')->exists(), 404);
    }

    private function assertScope(TicketOrder $order, Organization $organization, Event $event): void
    {
        abort_unless($order->organization_id === $organization->id && $order->event_id === $event->id, 404);
    }
}
