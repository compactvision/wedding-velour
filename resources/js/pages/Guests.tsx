import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    GlassWater,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Plus,
    QrCode,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    GuestPayload,
    tenantCatering,
    tenantGuests,
    TenantGuest,
} from '@/api/tenantClient';
import BulkWhatsappInviteDialog from '@/components/guests/BulkWhatsappInviteDialog';
import GuestFormDialog from '@/components/guests/GuestFormDialog';
import GuestInviteModal from '@/components/guests/GuestInviteModal';
import GuestRow from '@/components/guests/GuestRow';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { buildWhatsappInvitationLink } from '@/lib/guestInvitations';
import StatusBadge from '@/components/shared/StatusBadge';

export default function Guests() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const canUpdate = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('guests.update'),
    );
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingGuest, setEditingGuest] = useState<TenantGuest | null>(null);
    const [inviteGuest, setInviteGuest] = useState<TenantGuest | null>(null);
    const [showBulkWhatsapp, setShowBulkWhatsapp] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const {
        data: guestPage,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['tenant-guests', eventId],
        queryFn: () => tenantGuests.list(organizationSlug, eventSlug),
        enabled: !!eventId,
    });
    const guests = guestPage?.data || [];
    const { data: menuItems = [] } = useQuery({
        queryKey: ['tenant-catering-menu', eventId],
        queryFn: () =>
            tenantCatering
                .get(organizationSlug, eventSlug)
                .then((response) => response.data.menu_items),
        enabled: Boolean(eventId),
        retry: false,
    });

    const createMutation = useMutation({
        mutationFn: (data: GuestPayload) =>
            tenantGuests.create(organizationSlug, eventSlug, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['tenant-guests', eventId],
            });
            setShowForm(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: GuestPayload }) =>
            tenantGuests.update(organizationSlug, eventSlug, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['tenant-guests', eventId],
            });
            setShowForm(false);
            setEditingGuest(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            tenantGuests.delete(organizationSlug, eventSlug, id),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ['tenant-guests', eventId],
            }),
    });

    const handleSave = (formData: GuestPayload) => {
        if (editingGuest) {
            updateMutation.mutate({ id: editingGuest.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (guest: TenantGuest) => {
        setEditingGuest(guest);
        setShowForm(true);
    };
    const handleStatusChange = (
        guest: TenantGuest,
        status: TenantGuest['status'],
    ) => updateMutation.mutate({ id: guest.id, data: { status } });

    const filteredGuests = guests.filter((g) => {
        const matchesSearch = `${g.first_name} ${g.last_name} ${g.email}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' || g.status === statusFilter;

        return matchesSearch && matchesStatus;
    });
    const activeEvent = workspace
        ? {
              title: workspace.event.name,
              date: workspace.event.starts_at,
              venue: workspace.event.venue_name,
          }
        : null;
    const whatsappRecipientCount = activeEvent
        ? guests.filter((guest) =>
              buildWhatsappInvitationLink(guest, activeEvent),
          ).length
        : 0;
    const partySize = (guest: TenantGuest) =>
        1 + (Number(guest.companions) || 0);
    const invitedPeople = guests.reduce(
        (sum, guest) => sum + partySize(guest),
        0,
    );
    const confirmedPeople = guests
        .filter((g) => g.status === 'confirmed')
        .reduce((sum, guest) => sum + partySize(guest), 0);
    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
    const preferenceLabels = (guest: TenantGuest) =>
        (guest.menu_preferences || [])
            .map((id) => menuItemById.get(id))
            .filter(Boolean)
            .map((item) => `${item.emoji || '•'} ${item.name}`);

    if (!workspace) {
        return (
            <EmptyState
                icon={Users}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de gérer sa liste d’invités."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    return (
        <div>
            <PageHeader
                title="Invités"
                subtitle={`${invitedPeople} personnes · ${guests.length} fiches · ${confirmedPeople} confirmées`}
            >
                <Button asChild variant="outline">
                    <Link href="/onboarding">{workspace.event.name}</Link>
                </Button>
                <Button
                    variant="outline"
                    disabled={!activeEvent || whatsappRecipientCount === 0}
                    onClick={() => setShowBulkWhatsapp(true)}
                >
                    <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp tous
                </Button>
                {canUpdate && (
                    <Button
                        onClick={() => {
                            setEditingGuest(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Ajouter
                    </Button>
                )}
            </PageHeader>

            {/* Filters */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un invité..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="invited">Invité</SelectItem>
                        <SelectItem value="confirmed">Confirmé</SelectItem>
                        <SelectItem value="declined">Décliné</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Guest Table */}
            {isError ? (
                <Card className="border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
                    Impossible de charger les invités de cet événement. Vérifiez
                    vos droits ou réessayez.
                </Card>
            ) : isLoading ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                    Chargement des invités…
                </Card>
            ) : filteredGuests.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Aucun invité"
                    description={
                        canUpdate
                            ? 'Ajoutez votre premier invité pour commencer'
                            : 'Aucun invité n’est encore enregistré.'
                    }
                    actionLabel={canUpdate ? 'Ajouter un invité' : undefined}
                    onAction={canUpdate ? () => setShowForm(true) : undefined}
                />
            ) : (
                <Card className="hidden overflow-hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Nom
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Rôle
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Statut
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Accompagnants
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Préférences boissons
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                        Tél.
                                    </th>
                                    <th className="w-12 px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGuests.map((guest) => (
                                    <GuestRow
                                        key={guest.id}
                                        guest={guest}
                                        preferences={preferenceLabels(guest)}
                                        onEdit={handleEdit}
                                        onDelete={(g) =>
                                            deleteMutation.mutate(g.id)
                                        }
                                        onStatusChange={handleStatusChange}
                                        onInvite={(g) => setInviteGuest(g)}
                                        readOnly={!canUpdate}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {filteredGuests.length > 0 && (
                <div className="grid gap-3 md:hidden">
                    {filteredGuests.map((guest) => (
                        <Card
                            key={guest.id}
                            className="overflow-hidden border-border/70 bg-card"
                        >
                            <div className="flex items-start justify-between gap-3 p-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate font-medium">
                                            {guest.first_name} {guest.last_name}
                                        </p>
                                        <StatusBadge status={guest.status} />
                                    </div>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                        {guest.phone ||
                                            guest.email ||
                                            'Contact non renseigné'}
                                    </p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-md bg-muted px-3 py-2">
                                            <span className="block text-muted-foreground">
                                                Rôle
                                            </span>
                                            <span className="font-medium capitalize">
                                                {guest.role || 'guest'}
                                            </span>
                                        </div>
                                        <div className="rounded-md bg-muted px-3 py-2">
                                            <span className="block text-muted-foreground">
                                                Accomp.
                                            </span>
                                            <span className="font-medium">
                                                {guest.companions || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs">
                                        <span className="mb-1 flex items-center gap-1 text-muted-foreground">
                                            <GlassWater className="h-3.5 w-3.5" />{' '}
                                            Préférences boissons
                                        </span>
                                        {preferenceLabels(guest).length > 0 ? (
                                            <span className="font-medium">
                                                {preferenceLabels(guest).join(
                                                    ', ',
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Non renseigné
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {canUpdate && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 shrink-0"
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setInviteGuest(guest)
                                                }
                                            >
                                                <QrCode className="mr-2 h-4 w-4" />{' '}
                                                Invitation / QR
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleEdit(guest)
                                                }
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />{' '}
                                                Modifier
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleStatusChange(
                                                        guest,
                                                        'confirmed',
                                                    )
                                                }
                                            >
                                                Marquer confirmé
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleStatusChange(
                                                        guest,
                                                        'declined',
                                                    )
                                                }
                                            >
                                                Marquer décliné
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    deleteMutation.mutate(
                                                        guest.id,
                                                    )
                                                }
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />{' '}
                                                Supprimer
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                            {canUpdate && (
                                <div className="grid grid-cols-2 border-t bg-muted/30">
                                    <Button
                                        variant="ghost"
                                        className="h-12 rounded-none"
                                        onClick={() => setInviteGuest(guest)}
                                    >
                                        <QrCode className="h-4 w-4" /> Inviter
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-12 rounded-none"
                                        onClick={() => handleEdit(guest)}
                                    >
                                        <Pencil className="h-4 w-4" /> Modifier
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <GuestFormDialog
                open={showForm}
                onOpenChange={setShowForm}
                guest={editingGuest}
                onSave={handleSave}
            />
            <GuestInviteModal
                open={!!inviteGuest}
                onOpenChange={() => setInviteGuest(null)}
                guest={inviteGuest}
                wedding={activeEvent}
            />
            <BulkWhatsappInviteDialog
                open={showBulkWhatsapp}
                onOpenChange={setShowBulkWhatsapp}
                guests={guests}
                wedding={activeEvent}
            />
        </div>
    );
}
