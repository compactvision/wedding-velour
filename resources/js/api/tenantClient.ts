import axios from 'axios';
import { cachedGet, queuedMutation } from '@/lib/offline';

export type TenantGuest = {
    id: string;
    organization_id: string;
    event_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    status: 'invited' | 'confirmed' | 'declined' | 'absent';
    role: string;
    companions: number;
    dietary_restrictions: string | null;
    drink_preference: string | null;
    menu_preferences: string[];
    qr_code: string | null;
    invitation_link: string | null;
    rsvp_message: string | null;
    table_id: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type GuestPayload = Partial<
    Pick<
        TenantGuest,
        | 'first_name'
        | 'last_name'
        | 'email'
        | 'phone'
        | 'status'
        | 'role'
        | 'companions'
        | 'dietary_restrictions'
        | 'drink_preference'
        | 'menu_preferences'
        | 'rsvp_message'
        | 'table_id'
    >
>;

export type InvitationConfiguration = {
    eyebrow: string;
    title: string;
    greeting: string;
    body: string;
    rsvp_question: string;
    accept_label: string;
    decline_label: string;
    footer: string;
    background_image: string;
    accent_color: string;
    rsvp_deadline: string | null;
    show_event_details: boolean;
};

export type RsvpSummary = {
    guests: number;
    confirmed_guests: number;
    confirmed_people: number;
    declined_guests: number;
    pending_guests: number;
};

export type InvitationSettingsResponse = {
    data: {
        configuration: InvitationConfiguration;
        event_type: string;
        templates: Array<{
            id: string;
            name: string;
            slug: string;
            description: string;
            is_default: boolean;
            configuration: InvitationConfiguration;
        }>;
        rsvp_summary: RsvpSummary;
    };
};

export type SeatingTable = {
    id: string;
    organization_id: string;
    event_id: string;
    name: string;
    capacity: number;
    position_x: number;
    position_y: number;
    shape: 'round' | 'rectangular' | 'oval';
    category: 'vip' | 'family' | 'friends' | 'colleagues' | 'other';
    assigned_server: string | null;
    occupied_seats: number;
    remaining_seats: number;
    guests: TenantGuest[];
    created_at: string | null;
    updated_at: string | null;
};

export type SeatingTablePayload = Partial<
    Pick<
        SeatingTable,
        | 'name'
        | 'capacity'
        | 'shape'
        | 'category'
        | 'assigned_server'
        | 'position_x'
        | 'position_y'
    >
>;

export type SeatingSummary = {
    tables: number;
    capacity: number;
    people: number;
    seated_people: number;
    unseated_people: number;
};

export type SeatingPoint = { x: number; y: number };

export type SeatingResponse = {
    data: {
        tables: SeatingTable[];
        summary: SeatingSummary;
        room_polygon: SeatingPoint[];
    };
};

export type ScheduleItem = {
    id: string;
    organization_id: string;
    event_id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    ends_at: string | null;
    time: string;
    category:
        | 'ceremony'
        | 'reception'
        | 'dinner'
        | 'dance'
        | 'speech'
        | 'activity'
        | 'session'
        | 'break'
        | 'logistics'
        | 'other';
    status: 'upcoming' | 'in_progress' | 'completed';
    location: string | null;
    responsible_name: string | null;
    visibility: 'public' | 'internal';
    notify_all: boolean;
    image_url: string | null;
    sub_details: string[];
    sort_order: number;
    created_at: string | null;
    updated_at: string | null;
};

export type ScheduleItemPayload = Partial<
    Pick<
        ScheduleItem,
        | 'title'
        | 'description'
        | 'starts_at'
        | 'ends_at'
        | 'category'
        | 'status'
        | 'location'
        | 'responsible_name'
        | 'visibility'
        | 'notify_all'
        | 'image_url'
        | 'sub_details'
        | 'sort_order'
    >
>;

export type ScheduleSummary = {
    total: number;
    upcoming: number;
    in_progress: number;
    completed: number;
    public: number;
};

export type ScheduleResponse = {
    data: {
        items: ScheduleItem[];
        summary: ScheduleSummary;
    };
};

export type Communication = {
    id: string;
    organization_id: string;
    event_id: string;
    title: string;
    message: string;
    type:
        | 'announcement'
        | 'reminder'
        | 'schedule'
        | 'rsvp'
        | 'alert'
        | 'info'
        | 'order'
        | 'timeline'
        | 'photo';
    scope: 'campaign' | 'activity';
    audience: 'all_guests' | 'confirmed_guests' | 'pending_rsvp' | 'team';
    channel: 'in_app';
    delivery_status: 'draft' | 'scheduled' | 'sent' | 'delivered';
    scheduled_at: string | null;
    sent_at: string | null;
    recipient_count: number;
    is_read: boolean;
    action_url: string | null;
    created_by: { id: string; name: string } | null;
    created_at: string | null;
    updated_at: string | null;
};

export type CommunicationPayload = Partial<
    Pick<
        Communication,
        | 'title'
        | 'message'
        | 'type'
        | 'audience'
        | 'scheduled_at'
        | 'action_url'
    >
>;

export type CommunicationResponse = {
    data: {
        campaigns: Communication[];
        activity: Communication[];
        summary: {
            drafts: number;
            scheduled: number;
            sent: number;
            unread_activity: number;
            reachable_guests: number;
        };
    };
};

export type CateringMenuItem = {
    id: string;
    organization_id: string;
    event_id: string;
    name: string;
    emoji: string | null;
    category: 'starter' | 'food' | 'main' | 'dessert' | 'drink' | 'special';
    description: string | null;
    available_quantity: number;
    remaining_quantity: number;
    is_available: boolean;
    sort_order: number;
    allergens: string[];
    dietary_tags: string[];
    unit_price: number | null;
    service_period:
        | 'welcome'
        | 'starter'
        | 'main_service'
        | 'dessert'
        | 'late_service'
        | 'continuous';
    preference_count: number;
    created_at: string | null;
    updated_at: string | null;
};

export type CateringMenuItemPayload = Partial<
    Pick<
        CateringMenuItem,
        | 'name'
        | 'emoji'
        | 'category'
        | 'description'
        | 'available_quantity'
        | 'is_available'
        | 'sort_order'
        | 'allergens'
        | 'dietary_tags'
        | 'unit_price'
        | 'service_period'
    >
>;

export type CateringTableNeed = {
    table_id: string;
    table_name: string;
    guest_groups: number;
    people: number;
    preferences: Record<string, number>;
    dietary_restrictions: string[];
};

export type CateringResponse = {
    data: {
        menu_items: CateringMenuItem[];
        summary: {
            menu_items: number;
            available_items: number;
            confirmed_people: number;
            preference_selections: number;
            dietary_alerts: number;
            pending_orders: number;
        };
        table_needs: CateringTableNeed[];
    };
};

export type AccessCheckIn = {
    id: string;
    guest_id: string;
    guest_name: string | null;
    party_size: number;
    method: 'qr' | 'manual';
    checkpoint: string;
    checked_in_at: string;
    operator_name: string | null;
};

export type AccessGuest = Pick<
    TenantGuest,
    'id' | 'first_name' | 'last_name' | 'status' | 'companions' | 'table_id'
> & {
    checked_in: boolean;
    check_in: AccessCheckIn | null;
};

export type AccessResponse = {
    data: {
        guests: AccessGuest[];
        tables: Array<
            Pick<
                SeatingTable,
                'id' | 'name' | 'shape' | 'position_x' | 'position_y'
            >
        >;
        room_polygon: SeatingPoint[];
        summary: {
            invited_groups: number;
            confirmed_groups: number;
            confirmed_people: number;
            checked_in_groups: number;
            checked_in_people: number;
            remaining_people: number;
        };
        recent: AccessCheckIn[];
    };
};

export type TeamRole = {
    id: string;
    slug: string;
    name: string;
    permissions: string[];
};

export type TeamMember = {
    id: string;
    event_member_id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string | null;
    status: 'active' | 'suspended';
    is_owner: boolean;
    roles: Array<{ slug: string; name: string }>;
    permissions: string[];
    joined_at: string | null;
};

export type TeamInvitation = {
    id: string;
    email: string | null;
    phone: string | null;
    role_slug: string;
    status: 'pending';
    expires_at: string;
    invited_by?: string | null;
    invitation_url?: string;
};

export type TeamResponse = {
    data: {
        members: TeamMember[];
        invitations: TeamInvitation[];
        roles: TeamRole[];
    };
};

export type PricingLine = {
    key: string;
    label: string;
    quantity: number;
    unit?: string | null;
    unit_amount_minor: number;
    amount_minor: number;
};

export type BillingPlan = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    billing_model: 'per_event' | 'monthly' | 'annual' | 'enterprise';
    currency: string;
    base_price_minor: number;
    limits: {
        max_guests?: number;
        max_users?: number;
        max_modules?: number;
        storage_gb?: number;
    };
    features: Record<string, boolean | number | string | null>;
    estimated_total_minor: number | null;
    estimated_lines: PricingLine[];
};

export type PricingQuote = {
    id: string;
    plan: { slug: string; name: string };
    currency: string;
    subtotal_minor: number;
    discount_minor: number;
    tax_minor: number;
    total_minor: number;
    inputs: {
        estimated_guests: number;
        team_members: number;
        enabled_modules: number;
    };
    lines: PricingLine[];
    engine_version: string;
    expires_at: string;
    status: string;
    created_at: string;
};

export type BillingResponse = {
    data: {
        metrics: PricingQuote['inputs'];
        plans: BillingPlan[];
        quotes: PricingQuote[];
        payments: BillingPayment[];
        subscription: BillingSubscription | null;
        invoices: BillingInvoice[];
    };
};

export type BillingPayment = {
    id: string;
    quote_id: string;
    plan_name: string | null;
    amount_minor: number;
    currency: string;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
    provider: string;
    external_reference: string;
    paid_at: string | null;
    created_at: string;
};

export type BillingSubscription = {
    id: string;
    status: string;
    plan_name: string;
    starts_at: string;
    ends_at: string;
};

export type BillingInvoice = {
    id: string;
    number: string;
    status: string;
    currency: string;
    total_minor: number;
    issued_at: string;
};

export type BudgetCategory = {
    id: string;
    name: string;
    color: string;
    planned_minor: number;
    committed_minor: number;
    paid_minor: number;
    sort_order: number;
};

export type BudgetExpense = {
    id: string;
    budget_category_id: string | null;
    category_name: string | null;
    title: string;
    vendor_name: string | null;
    amount_minor: number;
    currency: string;
    status: 'planned' | 'pending' | 'approved' | 'paid' | 'rejected';
    incurred_on: string | null;
    due_on: string | null;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
};

export type BudgetResponse = {
    data: {
        budget: {
            id: string;
            name: string;
            currency: string;
            contingency_minor: number;
        };
        summary: {
            planned_minor: number;
            committed_minor: number;
            paid_minor: number;
            pending_minor: number;
            remaining_minor: number;
            expense_count: number;
        };
        categories: BudgetCategory[];
        expenses: BudgetExpense[];
    };
};

export type InventoryItem = {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    unit: string;
    current_quantity: string;
    reorder_level: string;
    unit_cost_minor: number;
    currency: string;
    location: string | null;
    status: 'active' | 'archived';
};

export type InventorySupplier = {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
};

export type PurchaseOrder = {
    id: string;
    supplier_id: string | null;
    supplier_name: string | null;
    reference: string;
    status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
    currency: string;
    expected_on: string | null;
    notes: string | null;
    total_minor: number;
    items: Array<{
        id: string;
        inventory_item_id: string;
        item_name: string;
        quantity: number;
        unit_cost_minor: number;
    }>;
    created_at: string;
};

export type InventoryResponse = {
    data: {
        summary: {
            item_count: number;
            low_stock_count: number;
            stock_value_minor: number;
            open_purchase_orders: number;
        };
        items: InventoryItem[];
        suppliers: InventorySupplier[];
        purchase_orders: PurchaseOrder[];
        movements: Array<{
            id: string;
            inventory_item_id: string;
            item_name: string;
            type: 'receipt' | 'issue' | 'adjustment';
            quantity_delta: number;
            quantity_after: number;
            reason: string | null;
            created_at: string;
        }>;
    };
};

export type EventVendor = {
    id: string;
    name: string;
    category: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    status: 'prospect' | 'selected' | 'active' | 'archived';
    rating: number | null;
    contracts_count: number;
};

export type VendorContract = {
    id: string;
    event_vendor_id: string;
    vendor_name: string;
    reference: string;
    title: string;
    scope: string | null;
    value_minor: number;
    paid_minor: number;
    remaining_minor: number;
    currency: string;
    status:
        | 'draft'
        | 'pending'
        | 'signed'
        | 'active'
        | 'completed'
        | 'cancelled';
    starts_on: string | null;
    ends_on: string | null;
    installments: Array<{
        id: string;
        label: string;
        amount_minor: number;
        due_on: string | null;
        status: 'pending' | 'paid';
        paid_at: string | null;
        is_overdue: boolean;
    }>;
    created_at: string;
};

export type VendorsResponse = {
    data: {
        summary: {
            vendor_count: number;
            active_contracts: number;
            contracted_minor: number;
            paid_minor: number;
            remaining_minor: number;
            overdue_installments: number;
        };
        vendors: EventVendor[];
        contracts: VendorContract[];
    };
};

type PaginatedGuests = {
    data: TenantGuest[];
    links: Record<string, string | null>;
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

function guestsEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/guests`;
}

export const tenantGuests = {
    list(
        organizationSlug: string,
        eventSlug: string,
        filters: Record<string, string | number | undefined> = {},
    ): Promise<PaginatedGuests> {
        return cachedGet<PaginatedGuests>(
            guestsEndpoint(organizationSlug, eventSlug),
            { params: filters },
        );
    },

    async create(
        organizationSlug: string,
        eventSlug: string,
        data: GuestPayload,
    ): Promise<TenantGuest> {
        const response = await axios.post(
            guestsEndpoint(organizationSlug, eventSlug),
            data,
        );

        return response.data.data;
    },

    update(
        organizationSlug: string,
        eventSlug: string,
        guestId: string,
        data: GuestPayload,
    ): Promise<TenantGuest> {
        return queuedMutation<{ data: TenantGuest }>(
            'put',
            `${guestsEndpoint(organizationSlug, eventSlug)}/${guestId}`,
            data,
            'Mise à jour de l’invité',
            {
                data: {
                    id: guestId,
                    ...data,
                    _offline_pending: true,
                } as unknown as TenantGuest,
            },
        ).then((response) => response.data);
    },

    async delete(
        organizationSlug: string,
        eventSlug: string,
        guestId: string,
    ): Promise<void> {
        await axios.delete(
            `${guestsEndpoint(organizationSlug, eventSlug)}/${guestId}`,
        );
    },
};

function invitationEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/invitation`;
}

export const tenantInvitations = {
    get(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<InvitationSettingsResponse> {
        return cachedGet<InvitationSettingsResponse>(
            invitationEndpoint(organizationSlug, eventSlug),
        );
    },

    async update(
        organizationSlug: string,
        eventSlug: string,
        configuration: InvitationConfiguration,
    ): Promise<InvitationSettingsResponse> {
        const response = await axios.put<InvitationSettingsResponse>(
            invitationEndpoint(organizationSlug, eventSlug),
            configuration,
        );

        return response.data;
    },
};

function seatingEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/seating`;
}

export const tenantSeating = {
    get(organizationSlug: string, eventSlug: string): Promise<SeatingResponse> {
        return cachedGet<SeatingResponse>(
            seatingEndpoint(organizationSlug, eventSlug),
        );
    },

    async createTable(
        organizationSlug: string,
        eventSlug: string,
        data: SeatingTablePayload,
    ): Promise<SeatingTable> {
        const response = await axios.post<{ data: SeatingTable }>(
            `${seatingEndpoint(organizationSlug, eventSlug)}/tables`,
            data,
        );

        return response.data.data;
    },

    async updateTable(
        organizationSlug: string,
        eventSlug: string,
        tableId: string,
        data: SeatingTablePayload,
    ): Promise<SeatingTable> {
        const response = await axios.put<{ data: SeatingTable }>(
            `${seatingEndpoint(organizationSlug, eventSlug)}/tables/${tableId}`,
            data,
        );

        return response.data.data;
    },

    async deleteTable(
        organizationSlug: string,
        eventSlug: string,
        tableId: string,
    ): Promise<void> {
        await axios.delete(
            `${seatingEndpoint(organizationSlug, eventSlug)}/tables/${tableId}`,
        );
    },

    async assignGuest(
        organizationSlug: string,
        eventSlug: string,
        guestId: string,
        tableId: string | null,
    ): Promise<TenantGuest> {
        const response = await axios.put<{ data: TenantGuest }>(
            `${seatingEndpoint(organizationSlug, eventSlug)}/assignments/${guestId}`,
            { table_id: tableId },
        );

        return response.data.data;
    },

    async saveLayout(
        organizationSlug: string,
        eventSlug: string,
        positions: Array<{ id: string; x: number; y: number }>,
        roomPolygon: SeatingPoint[],
    ): Promise<void> {
        await axios.put(
            `${seatingEndpoint(organizationSlug, eventSlug)}/layout`,
            { positions, room_polygon: roomPolygon },
        );
    },
};

function scheduleEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/schedule`;
}

export const tenantSchedule = {
    get(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<ScheduleResponse> {
        return cachedGet<ScheduleResponse>(
            scheduleEndpoint(organizationSlug, eventSlug),
        );
    },

    async create(
        organizationSlug: string,
        eventSlug: string,
        data: ScheduleItemPayload,
    ): Promise<ScheduleItem> {
        const response = await axios.post<{ data: ScheduleItem }>(
            `${scheduleEndpoint(organizationSlug, eventSlug)}/items`,
            data,
        );

        return response.data.data;
    },

    async update(
        organizationSlug: string,
        eventSlug: string,
        itemId: string,
        data: ScheduleItemPayload,
    ): Promise<ScheduleItem> {
        const response = await axios.put<{ data: ScheduleItem }>(
            `${scheduleEndpoint(organizationSlug, eventSlug)}/items/${itemId}`,
            data,
        );

        return response.data.data;
    },

    async delete(
        organizationSlug: string,
        eventSlug: string,
        itemId: string,
    ): Promise<void> {
        await axios.delete(
            `${scheduleEndpoint(organizationSlug, eventSlug)}/items/${itemId}`,
        );
    },
};

function communicationsEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/communications`;
}

export const tenantCommunications = {
    get(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<CommunicationResponse> {
        return cachedGet<CommunicationResponse>(
            communicationsEndpoint(organizationSlug, eventSlug),
        );
    },

    async create(
        organizationSlug: string,
        eventSlug: string,
        data: CommunicationPayload,
    ): Promise<Communication> {
        const response = await axios.post<{ data: Communication }>(
            communicationsEndpoint(organizationSlug, eventSlug),
            data,
        );

        return response.data.data;
    },

    async update(
        organizationSlug: string,
        eventSlug: string,
        communicationId: string,
        data: CommunicationPayload,
    ): Promise<Communication> {
        const response = await axios.put<{ data: Communication }>(
            `${communicationsEndpoint(organizationSlug, eventSlug)}/${communicationId}`,
            data,
        );

        return response.data.data;
    },

    async delete(
        organizationSlug: string,
        eventSlug: string,
        communicationId: string,
    ): Promise<void> {
        await axios.delete(
            `${communicationsEndpoint(organizationSlug, eventSlug)}/${communicationId}`,
        );
    },

    async publish(
        organizationSlug: string,
        eventSlug: string,
        communicationId: string,
    ): Promise<Communication> {
        const response = await axios.post<{ data: Communication }>(
            `${communicationsEndpoint(organizationSlug, eventSlug)}/${communicationId}/publish`,
        );

        return response.data.data;
    },

    async markRead(
        organizationSlug: string,
        eventSlug: string,
        communicationId: string,
    ): Promise<Communication> {
        const response = await axios.put<{ data: Communication }>(
            `${communicationsEndpoint(organizationSlug, eventSlug)}/${communicationId}/read`,
        );

        return response.data.data;
    },

    async markAllRead(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<void> {
        await axios.put(
            `${communicationsEndpoint(organizationSlug, eventSlug)}/read-all`,
        );
    },
};

function cateringEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/catering`;
}

export const tenantCatering = {
    get(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<CateringResponse> {
        return cachedGet<CateringResponse>(
            cateringEndpoint(organizationSlug, eventSlug),
        );
    },

    async create(
        organizationSlug: string,
        eventSlug: string,
        data: CateringMenuItemPayload,
    ): Promise<CateringMenuItem> {
        const response = await axios.post<{ data: CateringMenuItem }>(
            `${cateringEndpoint(organizationSlug, eventSlug)}/items`,
            data,
        );

        return response.data.data;
    },

    async update(
        organizationSlug: string,
        eventSlug: string,
        itemId: string,
        data: CateringMenuItemPayload,
    ): Promise<CateringMenuItem> {
        const response = await axios.put<{ data: CateringMenuItem }>(
            `${cateringEndpoint(organizationSlug, eventSlug)}/items/${itemId}`,
            data,
        );

        return response.data.data;
    },

    async delete(
        organizationSlug: string,
        eventSlug: string,
        itemId: string,
    ): Promise<void> {
        await axios.delete(
            `${cateringEndpoint(organizationSlug, eventSlug)}/items/${itemId}`,
        );
    },
};

function accessEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/access`;
}

export const tenantAccess = {
    get(organizationSlug: string, eventSlug: string): Promise<AccessResponse> {
        return cachedGet<AccessResponse>(
            accessEndpoint(organizationSlug, eventSlug),
        );
    },

    async lookup(
        organizationSlug: string,
        eventSlug: string,
        token: string,
    ): Promise<AccessGuest> {
        const response = await axios.post<{ data: AccessGuest }>(
            `${accessEndpoint(organizationSlug, eventSlug)}/lookup`,
            { token },
        );

        return response.data.data;
    },

    async checkIn(
        organizationSlug: string,
        eventSlug: string,
        guestId: string,
        method: 'qr' | 'manual',
    ): Promise<{ data: AccessCheckIn; meta: { already_present: boolean } }> {
        const response = await axios.post(
            `${accessEndpoint(organizationSlug, eventSlug)}/check-ins`,
            { guest_id: guestId, method },
        );

        return response.data;
    },

    async revoke(
        organizationSlug: string,
        eventSlug: string,
        checkInId: string,
    ): Promise<void> {
        await axios.delete(
            `${accessEndpoint(organizationSlug, eventSlug)}/check-ins/${checkInId}`,
        );
    },
};

function teamEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/team`;
}

export const tenantTeam = {
    get(organizationSlug: string, eventSlug: string): Promise<TeamResponse> {
        return cachedGet<TeamResponse>(
            teamEndpoint(organizationSlug, eventSlug),
        );
    },

    async invite(
        organizationSlug: string,
        eventSlug: string,
        data: {
            email?: string;
            phone?: string;
            role_slug: string;
        },
    ): Promise<TeamInvitation> {
        const response = await axios.post<{ data: TeamInvitation }>(
            `${teamEndpoint(organizationSlug, eventSlug)}/invitations`,
            data,
        );

        return response.data.data;
    },

    async updateMember(
        organizationSlug: string,
        eventSlug: string,
        memberId: string,
        data: { role_slug?: string; status?: 'active' | 'suspended' },
    ): Promise<TeamMember> {
        const response = await axios.put<{ data: TeamMember }>(
            `${teamEndpoint(organizationSlug, eventSlug)}/members/${memberId}`,
            data,
        );

        return response.data.data;
    },

    async cancelInvitation(
        organizationSlug: string,
        eventSlug: string,
        invitationId: string,
    ): Promise<void> {
        await axios.delete(
            `${teamEndpoint(organizationSlug, eventSlug)}/invitations/${invitationId}`,
        );
    },
};

function billingEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/billing`;
}

export const tenantBilling = {
    get(organizationSlug: string, eventSlug: string): Promise<BillingResponse> {
        return cachedGet<BillingResponse>(
            billingEndpoint(organizationSlug, eventSlug),
        );
    },

    async quote(
        organizationSlug: string,
        eventSlug: string,
        planSlug: string,
    ): Promise<PricingQuote> {
        const response = await axios.post<{ data: PricingQuote }>(
            `${billingEndpoint(organizationSlug, eventSlug)}/quotes`,
            { plan_slug: planSlug },
        );

        return response.data.data;
    },

    async createPayment(
        organizationSlug: string,
        eventSlug: string,
        quoteId: string,
        idempotencyKey: string,
    ): Promise<BillingPayment> {
        const response = await axios.post<{ data: BillingPayment }>(
            `${billingEndpoint(organizationSlug, eventSlug)}/payments`,
            {
                quote_id: quoteId,
                idempotency_key: idempotencyKey,
                provider: 'sandbox',
            },
        );

        return response.data.data;
    },
};

function budgetEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/budget`;
}

export const tenantBudget = {
    get(organizationSlug: string, eventSlug: string): Promise<BudgetResponse> {
        return cachedGet<BudgetResponse>(
            budgetEndpoint(organizationSlug, eventSlug),
        );
    },

    async createCategory(
        organizationSlug: string,
        eventSlug: string,
        data: { name: string; color: string; planned_minor: number },
    ): Promise<void> {
        await axios.post(
            `${budgetEndpoint(organizationSlug, eventSlug)}/categories`,
            data,
        );
    },

    async deleteCategory(
        organizationSlug: string,
        eventSlug: string,
        id: string,
    ): Promise<void> {
        await axios.delete(
            `${budgetEndpoint(organizationSlug, eventSlug)}/categories/${id}`,
        );
    },

    async createExpense(
        organizationSlug: string,
        eventSlug: string,
        data: {
            title: string;
            vendor_name?: string;
            amount_minor: number;
            budget_category_id?: string;
            status: 'planned' | 'pending';
            due_on?: string;
            notes?: string;
        },
    ): Promise<void> {
        await axios.post(
            `${budgetEndpoint(organizationSlug, eventSlug)}/expenses`,
            data,
        );
    },

    async approveExpense(
        organizationSlug: string,
        eventSlug: string,
        id: string,
        status: 'approved' | 'paid' | 'rejected',
    ): Promise<void> {
        await axios.put(
            `${budgetEndpoint(organizationSlug, eventSlug)}/expenses/${id}/approval`,
            { status },
        );
    },

    async deleteExpense(
        organizationSlug: string,
        eventSlug: string,
        id: string,
    ): Promise<void> {
        await axios.delete(
            `${budgetEndpoint(organizationSlug, eventSlug)}/expenses/${id}`,
        );
    },
};

function inventoryEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/inventory`;
}

export const tenantInventory = {
    get(
        organizationSlug: string,
        eventSlug: string,
    ): Promise<InventoryResponse> {
        return cachedGet<InventoryResponse>(
            inventoryEndpoint(organizationSlug, eventSlug),
        );
    },

    async createItem(
        organizationSlug: string,
        eventSlug: string,
        data: {
            name: string;
            sku?: string;
            category?: string;
            unit?: string;
            reorder_level?: number;
            unit_cost_minor?: number;
            location?: string;
        },
    ): Promise<void> {
        await axios.post(
            `${inventoryEndpoint(organizationSlug, eventSlug)}/items`,
            data,
        );
    },

    async move(
        organizationSlug: string,
        eventSlug: string,
        itemId: string,
        data: {
            type: 'receipt' | 'issue' | 'adjustment';
            quantity: number;
            reason?: string;
        },
    ): Promise<void> {
        await axios.post(
            `${inventoryEndpoint(organizationSlug, eventSlug)}/items/${itemId}/movements`,
            data,
        );
    },

    async createSupplier(
        organizationSlug: string,
        eventSlug: string,
        data: {
            name: string;
            contact_name?: string;
            email?: string;
            phone?: string;
        },
    ): Promise<void> {
        await axios.post(
            `${inventoryEndpoint(organizationSlug, eventSlug)}/suppliers`,
            data,
        );
    },

    async createPurchaseOrder(
        organizationSlug: string,
        eventSlug: string,
        data: {
            supplier_id?: string;
            expected_on?: string;
            notes?: string;
            items: Array<{
                inventory_item_id: string;
                quantity: number;
                unit_cost_minor: number;
            }>;
        },
    ): Promise<void> {
        await axios.post(
            `${inventoryEndpoint(organizationSlug, eventSlug)}/purchase-orders`,
            data,
        );
    },

    async transitionPurchaseOrder(
        organizationSlug: string,
        eventSlug: string,
        orderId: string,
        action: 'submit' | 'approve' | 'receive' | 'cancel',
    ): Promise<void> {
        await axios.put(
            `${inventoryEndpoint(organizationSlug, eventSlug)}/purchase-orders/${orderId}/transition`,
            { action },
        );
    },
};

function vendorsEndpoint(organizationSlug: string, eventSlug: string) {
    return `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}`;
}

export const tenantVendors = {
    get(organizationSlug: string, eventSlug: string): Promise<VendorsResponse> {
        return cachedGet<VendorsResponse>(
            `${vendorsEndpoint(organizationSlug, eventSlug)}/vendors`,
        );
    },

    async createVendor(
        organizationSlug: string,
        eventSlug: string,
        data: {
            name: string;
            category: string;
            contact_name?: string;
            email?: string;
            phone?: string;
        },
    ): Promise<void> {
        await axios.post(
            `${vendorsEndpoint(organizationSlug, eventSlug)}/vendors`,
            data,
        );
    },

    async createContract(
        organizationSlug: string,
        eventSlug: string,
        data: {
            event_vendor_id: string;
            title: string;
            scope?: string;
            value_minor: number;
            starts_on?: string;
            ends_on?: string;
            installments: Array<{
                label: string;
                amount_minor: number;
                due_on?: string;
            }>;
        },
    ): Promise<void> {
        await axios.post(
            `${vendorsEndpoint(organizationSlug, eventSlug)}/vendor-contracts`,
            data,
        );
    },

    async transitionContract(
        organizationSlug: string,
        eventSlug: string,
        contractId: string,
        action: 'submit' | 'sign' | 'activate' | 'complete' | 'cancel',
    ): Promise<void> {
        await axios.put(
            `${vendorsEndpoint(organizationSlug, eventSlug)}/vendor-contracts/${contractId}/transition`,
            { action },
        );
    },

    async markInstallmentPaid(
        organizationSlug: string,
        eventSlug: string,
        installmentId: string,
    ): Promise<void> {
        await axios.put(
            `${vendorsEndpoint(organizationSlug, eventSlug)}/contract-installments/${installmentId}/paid`,
        );
    },
};
