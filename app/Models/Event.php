<?php

namespace App\Models;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use HasUuids, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(EventType::class, 'event_type_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(EventMember::class);
    }

    public function organizationMembers(): BelongsToMany
    {
        return $this->belongsToMany(
            OrganizationMember::class,
            'event_members',
            'event_id',
            'organization_member_id',
        );
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(GuestModel::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(WeddingTableModel::class);
    }

    public function scheduleItems(): HasMany
    {
        return $this->hasMany(TimelineEventModel::class);
    }

    public function communications(): HasMany
    {
        return $this->hasMany(WeddingNotificationModel::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItemModel::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(OrderModel::class);
    }

    public function checkIns(): HasMany
    {
        return $this->hasMany(CheckIn::class);
    }

    public function budget(): HasOne
    {
        return $this->hasOne(Budget::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(BudgetCategory::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function suppliers(): HasMany
    {
        return $this->hasMany(Supplier::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(EventVendor::class);
    }

    public function vendorContracts(): HasMany
    {
        return $this->hasMany(VendorContract::class);
    }

    public function contractInstallments(): HasMany
    {
        return $this->hasMany(ContractInstallment::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(EventDocument::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(PhotoModel::class);
    }

    public function ticketOrders(): HasMany
    {
        return $this->hasMany(TicketOrder::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function badgeTemplates(): HasMany
    {
        return $this->hasMany(BadgeTemplate::class);
    }

    public function badges(): HasMany
    {
        return $this->hasMany(Badge::class);
    }

    public function eventDocuments(): HasMany
    {
        return $this->documents();
    }

    public function settings(): HasOne
    {
        return $this->hasOne(EventSetting::class);
    }

    public function enabledModules(): BelongsToMany
    {
        return $this->belongsToMany(
            EventModuleDefinition::class,
            'event_modules',
            'event_id',
            'module_id',
        )->withPivot(['organization_id', 'status', 'source', 'configuration']);
    }
}
