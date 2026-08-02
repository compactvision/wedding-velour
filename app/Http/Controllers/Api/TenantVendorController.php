<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\ContractInstallment;
use App\Models\Event;
use App\Models\EventVendor;
use App\Models\Organization;
use App\Models\VendorContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class TenantVendorController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeModule($event, 'vendors', 'vendors.view');
        $vendors = EventVendor::query()
            ->where('event_id', $event->id)
            ->withCount('contracts')
            ->orderBy('name')
            ->get();
        $contracts = VendorContract::query()
            ->where('event_id', $event->id)
            ->with(['vendor', 'installments' => fn ($query) => $query->orderBy('due_on')])
            ->latest()
            ->get();
        $total = $contracts->whereNotIn('status', ['cancelled'])->sum('value_minor');
        $paid = $contracts->flatMap->installments->where('status', 'paid')->sum('amount_minor');

        return response()->json(['data' => [
            'summary' => [
                'vendor_count' => $vendors->count(),
                'active_contracts' => $contracts->whereIn('status', ['signed', 'active'])->count(),
                'contracted_minor' => $total,
                'paid_minor' => $paid,
                'remaining_minor' => $total - $paid,
                'overdue_installments' => $contracts->flatMap->installments
                    ->where('status', 'pending')
                    ->filter(fn (ContractInstallment $installment) => $installment->due_on?->isPast())
                    ->count(),
            ],
            'vendors' => $vendors,
            'contracts' => $contracts->map(fn (VendorContract $contract) => $this->serializeContract($contract)),
        ]]);
    }

    public function storeVendor(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeModule($event, 'vendors', 'vendors.manage');
        $vendor = EventVendor::query()->create([
            ...$this->vendorData($request),
            'organization_id' => $organization->id,
            'event_id' => $event->id,
        ]);

        return response()->json(['data' => $vendor], Response::HTTP_CREATED);
    }

    public function updateVendor(
        Request $request,
        Organization $organization,
        Event $event,
        EventVendor $vendor,
    ): JsonResponse {
        $this->authorizeModule($event, 'vendors', 'vendors.manage');
        $this->assertScope($vendor, $organization, $event);
        $vendor->update($this->vendorData($request, true));

        return response()->json(['data' => $vendor->fresh()]);
    }

    public function destroyVendor(
        Organization $organization,
        Event $event,
        EventVendor $vendor,
    ): Response {
        $this->authorizeModule($event, 'vendors', 'vendors.manage');
        $this->assertScope($vendor, $organization, $event);
        abort_if($vendor->contracts()->exists(), 409, 'Un prestataire lié à un contrat ne peut pas être supprimé.');
        $vendor->delete();

        return response()->noContent();
    }

    public function storeContract(
        Request $request,
        Organization $organization,
        Event $event,
    ): JsonResponse {
        $this->authorizeModule($event, 'contracts', 'contracts.manage');
        $data = $request->validate([
            'event_vendor_id' => [
                'required', 'uuid',
                Rule::exists('event_vendors', 'id')->where('event_id', $event->id),
            ],
            'title' => ['required', 'string', 'max:180'],
            'scope' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'value_minor' => ['required', 'integer', 'min:1', 'max:999999999999'],
            'starts_on' => ['sometimes', 'nullable', 'date'],
            'ends_on' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_on'],
            'installments' => ['sometimes', 'array', 'max:50'],
            'installments.*.label' => ['required', 'string', 'max:180'],
            'installments.*.amount_minor' => ['required', 'integer', 'min:1', 'max:999999999999'],
            'installments.*.due_on' => ['sometimes', 'nullable', 'date'],
        ]);
        $installmentTotal = collect($data['installments'] ?? [])->sum('amount_minor');
        if ($installmentTotal > $data['value_minor']) {
            throw ValidationException::withMessages([
                'installments' => 'Le total des échéances dépasse la valeur du contrat.',
            ]);
        }

        $contract = DB::transaction(function () use ($data, $organization, $event, $request) {
            $number = VendorContract::query()->where('event_id', $event->id)->count() + 1;
            $contract = VendorContract::query()->create([
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'event_vendor_id' => $data['event_vendor_id'],
                'reference' => sprintf('CTR-%04d', $number),
                'title' => $data['title'],
                'scope' => $data['scope'] ?? null,
                'value_minor' => $data['value_minor'],
                'currency' => $organization->currency,
                'status' => 'draft',
                'starts_on' => $data['starts_on'] ?? null,
                'ends_on' => $data['ends_on'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]);
            foreach ($data['installments'] ?? [] as $installment) {
                ContractInstallment::query()->create([
                    'organization_id' => $organization->id,
                    'event_id' => $event->id,
                    'vendor_contract_id' => $contract->id,
                    ...$installment,
                ]);
            }

            return $contract->load(['vendor', 'installments']);
        });

        return response()->json(['data' => $this->serializeContract($contract)], Response::HTTP_CREATED);
    }

    public function transitionContract(
        Request $request,
        Organization $organization,
        Event $event,
        VendorContract $vendorContract,
    ): JsonResponse {
        $this->assertScope($vendorContract, $organization, $event);
        $action = $request->validate([
            'action' => ['required', Rule::in(['submit', 'sign', 'activate', 'complete', 'cancel'])],
        ])['action'];
        $permission = in_array($action, ['sign', 'complete'], true)
            ? 'contracts.approve'
            : 'contracts.manage';
        $this->authorizeModule($event, 'contracts', $permission);

        $expected = [
            'submit' => ['draft'],
            'sign' => ['pending'],
            'activate' => ['signed'],
            'complete' => ['signed', 'active'],
            'cancel' => ['draft', 'pending', 'signed', 'active'],
        ];
        if (! in_array($vendorContract->status, $expected[$action], true)) {
            throw ValidationException::withMessages(['action' => 'Transition de contrat invalide.']);
        }
        $vendorContract->update(match ($action) {
            'submit' => ['status' => 'pending'],
            'sign' => [
                'status' => 'signed',
                'signed_at' => now(),
                'approved_by_user_id' => $request->user()->id,
            ],
            'activate' => ['status' => 'active'],
            'complete' => ['status' => 'completed', 'completed_at' => now()],
            'cancel' => ['status' => 'cancelled'],
        });

        return response()->json([
            'data' => $this->serializeContract($vendorContract->fresh(['vendor', 'installments'])),
        ]);
    }

    public function markInstallmentPaid(
        Request $request,
        Organization $organization,
        Event $event,
        ContractInstallment $contractInstallment,
    ): JsonResponse {
        $this->authorizeModule($event, 'contracts', 'contracts.approve');
        $this->assertScope($contractInstallment, $organization, $event);
        $contract = $contractInstallment->contract;
        abort_unless(in_array($contract->status, ['signed', 'active', 'completed'], true), 422, 'Le contrat doit être signé.');
        $contractInstallment->update([
            'status' => 'paid',
            'paid_at' => $contractInstallment->paid_at ?: now(),
            'paid_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $contractInstallment->fresh()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function vendorData(Request $request, bool $partial = false): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$presence, 'string', 'max:180'],
            'category' => [$presence, 'string', 'max:120'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'status' => ['sometimes', Rule::in(['prospect', 'selected', 'active', 'archived'])],
            'rating' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeContract(VendorContract $contract): array
    {
        $paid = $contract->installments->where('status', 'paid')->sum('amount_minor');

        return [
            'id' => $contract->id,
            'event_vendor_id' => $contract->event_vendor_id,
            'vendor_name' => $contract->vendor?->name,
            'reference' => $contract->reference,
            'title' => $contract->title,
            'scope' => $contract->scope,
            'value_minor' => $contract->value_minor,
            'paid_minor' => $paid,
            'remaining_minor' => $contract->value_minor - $paid,
            'currency' => $contract->currency,
            'status' => $contract->status,
            'starts_on' => $contract->starts_on?->format('Y-m-d'),
            'ends_on' => $contract->ends_on?->format('Y-m-d'),
            'signed_at' => $contract->signed_at?->toIso8601String(),
            'completed_at' => $contract->completed_at?->toIso8601String(),
            'installments' => $contract->installments->map(fn (ContractInstallment $installment) => [
                'id' => $installment->id,
                'label' => $installment->label,
                'amount_minor' => $installment->amount_minor,
                'due_on' => $installment->due_on?->format('Y-m-d'),
                'status' => $installment->status,
                'paid_at' => $installment->paid_at?->toIso8601String(),
                'is_overdue' => $installment->status === 'pending' && $installment->due_on?->isPast(),
            ])->values(),
            'created_at' => $contract->created_at?->toIso8601String(),
        ];
    }

    private function authorizeModule(Event $event, string $module, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id, 403);
        abort_unless($context->allows($permission), 403);
        abort_unless(
            $event->enabledModules()
                ->where('modules.slug', $module)
                ->wherePivot('status', 'enabled')
                ->exists(),
            404,
            "Le module {$module} n’est pas activé pour cet événement.",
        );
    }

    private function assertScope(Model $model, Organization $organization, Event $event): void
    {
        abort_unless(
            $model->getAttribute('organization_id') === $organization->id
            && $model->getAttribute('event_id') === $event->id,
            404,
        );
    }
}
