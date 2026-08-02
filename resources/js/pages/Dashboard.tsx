import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Users,
    UtensilsCrossed,
    TableProperties,
    Clock,
    Plus,
    Heart,
    CalendarDays,
    Pencil,
    Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function WeddingFormDialog({ open, onOpenChange, wedding = null }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        title: '',
        date: '',
        venue: '',
        venue_address: '',
        max_guests: 100,
        status: 'planning',
        notes: '',
    });

    React.useEffect(() => {
        if (wedding) {
            setForm({
                title: wedding.title || '',
                date: wedding.date || '',
                venue: wedding.venue || '',
                venue_address: wedding.venue_address || '',
                max_guests: wedding.max_guests || 100,
                status: wedding.status || 'planning',
                notes: wedding.notes || '',
            });
            return;
        }

        setForm({
            title: '',
            date: '',
            venue: '',
            venue_address: '',
            max_guests: 100,
            status: 'planning',
            notes: '',
        });
    }, [wedding, open]);

    const createMutation = useMutation({
        mutationFn: (data) =>
            base44.entities.Wedding.create({
                ...data,
                max_guests: Number(data.max_guests) || 0,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weddings'] });
            onOpenChange(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) =>
            base44.entities.Wedding.update(wedding.id, {
                ...data,
                max_guests: Number(data.max_guests) || 0,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weddings'] });
            onOpenChange(false);
        },
    });

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const save = () => {
        if (wedding) {
            updateMutation.mutate(form);
        } else {
            createMutation.mutate(form);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-display">
                        {wedding ? 'Modifier le mariage' : 'Nouveau Mariage'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Titre (ex: Sophie & Thomas)</Label>
                        <Input
                            value={form.title}
                            onChange={(e) =>
                                setForm({ ...form, title: e.target.value })
                            }
                            placeholder="Les mariés"
                        />
                    </div>
                    <div>
                        <Label>Date</Label>
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) =>
                                setForm({ ...form, date: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <Label>Lieu</Label>
                        <Input
                            value={form.venue}
                            onChange={(e) =>
                                setForm({ ...form, venue: e.target.value })
                            }
                            placeholder="Château de..."
                        />
                    </div>
                    <div>
                        <Label>Adresse</Label>
                        <Input
                            value={form.venue_address}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    venue_address: e.target.value,
                                })
                            }
                            placeholder="Adresse complète du lieu"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Capacité</Label>
                            <Input
                                type="number"
                                min={0}
                                value={form.max_guests}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        max_guests: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>Statut</Label>
                            <Input
                                value={form.status}
                                onChange={(e) =>
                                    setForm({ ...form, status: e.target.value })
                                }
                                placeholder="planning"
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Input
                            value={form.notes}
                            onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                            }
                            placeholder="Informations internes"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={save}
                        disabled={!form.title || !form.date || isSaving}
                    >
                        {wedding ? 'Enregistrer' : 'Créer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Dashboard() {
    const {
        weddings,
        activeWedding,
        activeWeddingId,
        setActiveWeddingId,
        isLoading,
    } = useActiveWedding();
    const workspace = (usePage().props as any).workspace;
    const enabledModules: string[] = workspace?.modules || [];
    const permissions: string[] = workspace?.permissions || [];
    const hasModule = (...modules: string[]) =>
        modules.some((module) => enabledModules.includes(module));
    const can = (permission: string) =>
        permissions.includes('*') || permissions.includes(permission);
    const queryClient = useQueryClient();
    const [showNewWedding, setShowNewWedding] = useState(false);
    const [showEditWedding, setShowEditWedding] = useState(false);
    const [showDeleteWedding, setShowDeleteWedding] = useState(false);

    const { data: guests = [] } = useQuery({
        queryKey: ['guests', activeWeddingId],
        queryFn: () =>
            base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
        enabled: !!activeWeddingId && hasModule('guests') && can('guests.view'),
    });

    const { data: tables = [] } = useQuery({
        queryKey: ['tables', activeWeddingId],
        queryFn: () =>
            base44.entities.WeddingTable.filter({
                wedding_id: activeWeddingId,
            }),
        enabled:
            !!activeWeddingId && hasModule('seating') && can('seating.view'),
    });

    const { data: orders = [] } = useQuery({
        queryKey: ['orders', activeWeddingId],
        queryFn: () =>
            base44.entities.Order.filter({ wedding_id: activeWeddingId }),
        enabled:
            !!activeWeddingId && hasModule('catering') && can('catering.view'),
    });

    const { data: timeline = [] } = useQuery({
        queryKey: ['timeline', activeWeddingId],
        queryFn: () =>
            base44.entities.TimelineEvent.filter({
                wedding_id: activeWeddingId,
            }),
        enabled:
            !!activeWeddingId && hasModule('schedule') && can('schedule.view'),
    });

    const partySize = (guest) => 1 + (Number(guest.companions) || 0);
    const invitedPeople = guests.reduce(
        (sum, guest) => sum + partySize(guest),
        0,
    );
    const confirmedGuests = guests
        .filter((g) => g.status === 'confirmed')
        .reduce((sum, guest) => sum + partySize(guest), 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const totalCompanions = guests.reduce(
        (sum, g) => sum + (g.companions || 0),
        0,
    );
    const deleteWeddingMutation = useMutation({
        mutationFn: (id: string) => base44.entities.Wedding.delete(id),
        onSuccess: async () => {
            const nextWedding =
                weddings.find((w) => w.id !== activeWeddingId) || null;
            if (nextWedding) {
                setActiveWeddingId(nextWedding.id);
            } else {
                localStorage.removeItem('activeWeddingId');
                setActiveWeddingId(null);
            }
            setShowDeleteWedding(false);
            await queryClient.invalidateQueries({ queryKey: ['weddings'] });
        },
    });

    if (!activeWedding && !isLoading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <EmptyState
                    icon={Heart}
                    title="Bienvenue sur Planivo"
                    description="Créez votre premier mariage pour commencer l'organisation"
                    actionLabel="Créer un mariage"
                    onAction={() => setShowNewWedding(true)}
                />
                <WeddingFormDialog
                    open={showNewWedding}
                    onOpenChange={setShowNewWedding}
                />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Tableau de bord" subtitle={activeWedding?.title}>
                <WeddingSelector
                    weddings={weddings}
                    activeWeddingId={activeWeddingId}
                    onSelect={setActiveWeddingId}
                />
                <Button onClick={() => setShowNewWedding(true)} size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Nouveau
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {hasModule('guests') && can('guests.view') && (
                    <StatCard
                        title="Invités"
                        value={invitedPeople}
                        subtitle={`${guests.length} fiches · ${confirmedGuests} présents · ${totalCompanions} accompagnants`}
                        icon={Users}
                    />
                )}
                {hasModule('seating') && can('seating.view') && (
                    <StatCard
                        title="Tables"
                        value={tables.length}
                        subtitle={`${tables.reduce((s, t) => s + (t.capacity || 0), 0)} places`}
                        icon={TableProperties}
                    />
                )}
                {hasModule('catering') && can('catering.view') && (
                    <StatCard
                        title="Commandes"
                        value={orders.length}
                        subtitle={`${pendingOrders} en attente`}
                        icon={UtensilsCrossed}
                    />
                )}
                {hasModule('schedule') && can('schedule.view') && (
                    <StatCard
                        title="Programme"
                        value={timeline.length}
                        subtitle="événements planifiés"
                        icon={Clock}
                    />
                )}
            </div>

            {/* Content Grid */}
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                {/* Wedding Info */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 font-display text-lg">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            Informations
                        </CardTitle>
                        {can('event.update') && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowEditWedding(true)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Modifier
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() => setShowDeleteWedding(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                                Date
                            </span>
                            <span className="text-right text-sm font-medium">
                                {activeWedding?.date
                                    ? format(
                                          new Date(activeWedding.date),
                                          'dd MMMM yyyy',
                                          { locale: fr },
                                      )
                                    : '-'}
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                                Lieu
                            </span>
                            <span className="text-right text-sm font-medium">
                                {activeWedding?.venue || '-'}
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                                Adresse
                            </span>
                            <span className="text-right text-sm font-medium">
                                {activeWedding?.venue_address || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                                Statut
                            </span>
                            <StatusBadge
                                status={activeWedding?.status || 'planning'}
                            />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                                Capacité max
                            </span>
                            <span className="text-sm font-medium">
                                {activeWedding?.max_guests || 100} personnes
                            </span>
                        </div>
                        {activeWedding?.notes && (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-sm text-muted-foreground">
                                    Notes
                                </span>
                                <span className="text-right text-sm font-medium">
                                    {activeWedding.notes}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                {hasModule('catering') && can('catering.view') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-display text-lg">
                                <UtensilsCrossed className="h-5 w-5 text-primary" />
                                Commandes récentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Aucune commande
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {orders.slice(0, 5).map((order) => (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    {order.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {order.table_name ||
                                                        'Table ?'}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={order.status}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* RSVP Overview */}
                {hasModule('guests') && can('guests.view') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-display text-lg">
                                <Users className="h-5 w-5 text-primary" />
                                Réponses RSVP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    'confirmed',
                                    'invited',
                                    'declined',
                                    'absent',
                                ].map((status) => {
                                    const count = guests
                                        .filter((g) => g.status === status)
                                        .reduce(
                                            (sum, guest) =>
                                                sum + partySize(guest),
                                            0,
                                        );
                                    const pct =
                                        invitedPeople > 0
                                            ? Math.round(
                                                  (count / invitedPeople) * 100,
                                              )
                                            : 0;
                                    return (
                                        <div key={status}>
                                            <div className="mb-1 flex justify-between text-sm">
                                                <StatusBadge status={status} />
                                                <span className="font-medium">
                                                    {count} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Upcoming Timeline */}
                {hasModule('schedule') && can('schedule.view') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-display text-lg">
                                <Clock className="h-5 w-5 text-primary" />
                                Programme du jour
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeline.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Aucun événement planifié
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {timeline
                                        .sort((a, b) =>
                                            (a.time || '').localeCompare(
                                                b.time || '',
                                            ),
                                        )
                                        .slice(0, 5)
                                        .map((evt) => (
                                            <div
                                                key={evt.id}
                                                className="flex items-center gap-3 border-b border-border/50 py-2 last:border-0"
                                            >
                                                <span className="min-w-[50px] font-mono text-sm font-semibold text-primary">
                                                    {evt.time}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {evt.title}
                                                    </p>
                                                    <StatusBadge
                                                        status={evt.status}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <WeddingFormDialog
                open={showNewWedding}
                onOpenChange={setShowNewWedding}
            />
            <WeddingFormDialog
                open={showEditWedding}
                onOpenChange={setShowEditWedding}
                wedding={activeWedding}
            />
            <Dialog
                open={showDeleteWedding}
                onOpenChange={setShowDeleteWedding}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display">
                            Supprimer ce mariage ?
                        </DialogTitle>
                        <DialogDescription>
                            Cette action supprimera aussi les invités, tables,
                            menus, commandes, photos et programme liés à{' '}
                            {activeWedding?.title || 'ce mariage'}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteWedding(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={
                                !activeWeddingId ||
                                deleteWeddingMutation.isPending
                            }
                            onClick={() =>
                                activeWeddingId &&
                                deleteWeddingMutation.mutate(activeWeddingId)
                            }
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteWeddingMutation.isPending
                                ? 'Suppression...'
                                : 'Supprimer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
