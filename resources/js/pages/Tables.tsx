import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2,
    LayoutDashboard,
    List,
    Pencil,
    Plus,
    TableProperties,
    Trash2,
    UserMinus,
    UserPlus,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    SeatingPoint,
    SeatingTable,
    SeatingTablePayload,
    TenantGuest,
    tenantGuests,
    tenantSeating,
} from '@/api/tenantClient';
import FloorPlanEditor from '@/components/tables/FloorPlanEditor';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const categoryColors: Record<SeatingTable['category'], string> = {
    vip: 'border-amber-300 bg-amber-50/70',
    family: 'border-rose-300 bg-rose-50/70',
    friends: 'border-blue-300 bg-blue-50/70',
    colleagues: 'border-green-300 bg-green-50/70',
    other: 'border-border bg-card',
};

const categoryLabels: Record<SeatingTable['category'], string> = {
    vip: 'VIP',
    family: 'Famille',
    friends: 'Amis',
    colleagues: 'Collègues',
    other: 'Autre',
};

const shapeLabels: Record<SeatingTable['shape'], string> = {
    round: 'Ronde',
    rectangular: 'Rectangulaire',
    oval: 'Ovale',
};

const partySize = (guest: TenantGuest) =>
    1 + Math.max(0, Number(guest.companions) || 0);

type TableFormProps = {
    open: boolean;
    table: SeatingTable | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: SeatingTablePayload) => void;
};

function TableFormDialog({
    open,
    table,
    pending,
    onOpenChange,
    onSave,
}: TableFormProps) {
    const [form, setForm] = useState<Required<
        Pick<SeatingTablePayload, 'name' | 'capacity' | 'shape' | 'category'>
    >>({
        name: '',
        capacity: 8,
        shape: 'round',
        category: 'other',
    });

    useEffect(() => {
        setForm({
            name: table?.name || '',
            capacity: table?.capacity || 8,
            shape: table?.shape || 'round',
            category: table?.category || 'other',
        });
    }, [open, table]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {table ? 'Modifier la table' : 'Nouvelle table'}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label htmlFor="table-name">Nom</Label>
                        <Input
                            id="table-name"
                            value={form.name}
                            onChange={(event) =>
                                setForm({ ...form, name: event.target.value })
                            }
                            placeholder="Table Horizon"
                        />
                    </div>
                    <div>
                        <Label htmlFor="table-capacity">Capacité</Label>
                        <Input
                            id="table-capacity"
                            type="number"
                            min={1}
                            max={1000}
                            value={form.capacity}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    capacity: Number(event.target.value),
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label>Forme</Label>
                        <Select
                            value={form.shape}
                            onValueChange={(shape: SeatingTable['shape']) =>
                                setForm({ ...form, shape })
                            }
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(shapeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Catégorie</Label>
                        <Select
                            value={form.category}
                            onValueChange={(category: SeatingTable['category']) =>
                                setForm({ ...form, category })
                            }
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(categoryLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button
                        disabled={!form.name.trim() || form.capacity < 1 || pending}
                        onClick={() => onSave(form)}
                    >
                        {pending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type AssignGuestProps = {
    table: SeatingTable | null;
    guests: TenantGuest[];
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onAssign: (guestId: string, tableId: string) => void;
};

function AssignGuestDialog({
    table,
    guests,
    pending,
    onOpenChange,
    onAssign,
}: AssignGuestProps) {
    const [guestId, setGuestId] = useState('');
    const unassigned = guests.filter((guest) => !guest.table_id);
    const selected = unassigned.find((guest) => guest.id === guestId);
    const fits = !selected || partySize(selected) <= (table?.remaining_seats || 0);

    useEffect(() => setGuestId(''), [table?.id]);

    return (
        <Dialog open={Boolean(table)} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Placer à {table?.name}</DialogTitle>
                </DialogHeader>
                <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                            Places disponibles
                        </span>
                        <strong>
                            {table?.remaining_seats}/{table?.capacity}
                        </strong>
                    </div>
                </div>
                <Select value={guestId} onValueChange={setGuestId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choisir un invité ou un groupe" />
                    </SelectTrigger>
                    <SelectContent>
                        {unassigned.map((guest) => (
                            <SelectItem key={guest.id} value={guest.id}>
                                {guest.first_name} {guest.last_name} ·{' '}
                                {partySize(guest)} place
                                {partySize(guest) > 1 ? 's' : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selected && (
                    <p
                        className={cn(
                            'rounded-lg border px-3 py-2 text-sm',
                            fits
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-destructive/30 bg-destructive/5 text-destructive',
                        )}
                    >
                        {fits
                            ? `Ce groupe occupera ${partySize(selected)} place${partySize(selected) > 1 ? 's' : ''}.`
                            : `Il manque ${partySize(selected) - (table?.remaining_seats || 0)} place(s) sur cette table.`}
                    </p>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button
                        disabled={!guestId || !fits || pending}
                        onClick={() => table && onAssign(guestId, table.id)}
                    >
                        Placer le groupe
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Tables() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const canUpdate = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('seating.update'),
    );
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'plan'>('list');
    const [showForm, setShowForm] = useState(false);
    const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
    const [assignTable, setAssignTable] = useState<SeatingTable | null>(null);

    const seatingQuery = useQuery({
        queryKey: ['tenant-seating', eventId],
        queryFn: () => tenantSeating.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const guestsQuery = useQuery({
        queryKey: ['tenant-guests', eventId],
        queryFn: () =>
            tenantGuests.list(organizationSlug, eventSlug, { per_page: 100 }),
        enabled: Boolean(eventId),
    });
    const seating = seatingQuery.data?.data;
    const tables = seating?.tables || [];
    const guests = guestsQuery.data?.data || [];
    const roomPolygon = seating?.room_polygon || [];

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['tenant-seating', eventId] });
        queryClient.invalidateQueries({ queryKey: ['tenant-guests', eventId] });
    };

    const createMutation = useMutation({
        mutationFn: (data: SeatingTablePayload) =>
            tenantSeating.createTable(organizationSlug, eventSlug, data),
        onSuccess: () => {
            refresh();
            setShowForm(false);
        },
    });
    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: SeatingTablePayload;
        }) => tenantSeating.updateTable(organizationSlug, eventSlug, id, data),
        onSuccess: () => {
            refresh();
            setShowForm(false);
            setEditingTable(null);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            tenantSeating.deleteTable(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });
    const assignMutation = useMutation({
        mutationFn: ({
            guestId,
            tableId,
        }: {
            guestId: string;
            tableId: string | null;
        }) =>
            tenantSeating.assignGuest(
                organizationSlug,
                eventSlug,
                guestId,
                tableId,
            ),
        onSuccess: () => {
            refresh();
            setAssignTable(null);
        },
    });

    const handleSave = (data: SeatingTablePayload) => {
        if (editingTable) {
            updateMutation.mutate({ id: editingTable.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const currentPositions = useMemo(
        () =>
            tables.map((table) => ({
                id: table.id,
                x: table.position_x,
                y: table.position_y,
            })),
        [tables],
    );
    const saveLayout = useCallback(
        async (
            positions: Array<{ id: string; x: number; y: number }>,
            polygon: SeatingPoint[],
        ) => {
            await tenantSeating.saveLayout(
                organizationSlug,
                eventSlug,
                positions,
                polygon,
            );
            refresh();
        },
        [organizationSlug, eventSlug, eventId],
    );

    if (!workspace) {
        return (
            <EmptyState
                icon={TableProperties}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de créer son plan de salle."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (seatingQuery.isError) {
        return (
            <EmptyState
                icon={TableProperties}
                title="Module non disponible"
                description="Activez Tables et placement dans les modules de cet événement."
                actionLabel="Voir l’espace de travail"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const summary = seating?.summary || {
        tables: 0,
        capacity: 0,
        people: 0,
        seated_people: 0,
        unseated_people: 0,
    };
    const stats: Array<{
        label: string;
        value: number;
        icon: LucideIcon;
    }> = [
        { label: 'Tables', value: summary.tables, icon: TableProperties },
        { label: 'Capacité', value: summary.capacity, icon: Users },
        {
            label: 'Personnes placées',
            value: summary.seated_people,
            icon: CheckCircle2,
        },
        {
            label: 'À placer',
            value: summary.unseated_people,
            icon: UserPlus,
        },
    ];

    return (
        <div>
            <PageHeader
                title="Tables & placement"
                subtitle={`${workspace.event.name} · ${summary.seated_people}/${summary.people} personnes placées`}
            >
                <Button variant="outline" asChild>
                    <Link href="/onboarding">Changer d’événement</Link>
                </Button>
                {canUpdate && (
                    <Button
                        onClick={() => {
                            setEditingTable(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter une table
                    </Button>
                )}
            </PageHeader>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon }) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="text-2xl font-semibold">{value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {tables.length > 0 && (
                <Tabs
                    value={view}
                    onValueChange={(value) => setView(value as 'list' | 'plan')}
                    className="mb-6"
                >
                    <TabsList>
                        <TabsTrigger value="list">
                            <List className="mr-2 h-4 w-4" /> Liste
                        </TabsTrigger>
                        <TabsTrigger value="plan">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Plan interactif
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {seatingQuery.isLoading ? (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                    Chargement du plan de salle…
                </Card>
            ) : view === 'list' || tables.length === 0 ? (
                tables.length === 0 ? (
                    <EmptyState
                        icon={TableProperties}
                        title="Aucune table"
                        description="Créez les espaces d’accueil, puis placez les invités et leurs accompagnants."
                        actionLabel={canUpdate ? 'Créer une table' : undefined}
                        onAction={
                            canUpdate
                                ? () => {
                                      setEditingTable(null);
                                      setShowForm(true);
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {tables.map((table) => {
                            const full = table.remaining_seats === 0;
                            return (
                                <Card
                                    key={table.id}
                                    className={cn(
                                        'border-2 p-5 transition-shadow hover:shadow-md',
                                        categoryColors[table.category],
                                    )}
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold">
                                                    {table.name}
                                                </h3>
                                                <Badge variant="outline">
                                                    {categoryLabels[table.category]}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {shapeLabels[table.shape]}
                                            </p>
                                        </div>
                                        {canUpdate && (
                                            <div className="flex">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingTable(table);
                                                        setShowForm(true);
                                                    }}
                                                    aria-label={`Modifier ${table.name}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Supprimer ${table.name} ? Les invités seront replacés dans la liste d’attente.`,
                                                            )
                                                        ) {
                                                            deleteMutation.mutate(table.id);
                                                        }
                                                    }}
                                                    aria-label={`Supprimer ${table.name}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="mb-2 flex justify-between text-sm">
                                            <span>Occupation</span>
                                            <strong>
                                                {table.occupied_seats}/{table.capacity}
                                            </strong>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-background/80">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full',
                                                    full ? 'bg-amber-500' : 'bg-primary',
                                                )}
                                                style={{
                                                    width: `${Math.min(100, (table.occupied_seats / table.capacity) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4 space-y-2">
                                        {table.guests.length === 0 ? (
                                            <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                                                Aucun invité placé
                                            </p>
                                        ) : (
                                            table.guests.map((guest) => (
                                                <div
                                                    key={guest.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm"
                                                >
                                                    <span className="min-w-0 truncate">
                                                        {guest.first_name}{' '}
                                                        {guest.last_name}
                                                        <span className="text-xs text-muted-foreground">
                                                            {' '}· {partySize(guest)} place
                                                            {partySize(guest) > 1 ? 's' : ''}
                                                        </span>
                                                    </span>
                                                    {canUpdate && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            onClick={() =>
                                                                assignMutation.mutate({
                                                                    guestId: guest.id,
                                                                    tableId: null,
                                                                })
                                                            }
                                                            aria-label={`Retirer ${guest.first_name}`}
                                                        >
                                                            <UserMinus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {canUpdate && !full && (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setAssignTable(table)}
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Placer un invité
                                        </Button>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )
            ) : (
                <FloorPlanEditor
                    tables={tables.map((table) => ({
                        ...table,
                        seated: table.occupied_seats,
                    }))}
                    onUpdatePosition={() => undefined}
                    onSaveAll={(positions) =>
                        saveLayout(
                            Object.entries(positions).map(([id, point]) => ({
                                id,
                                ...point,
                            })),
                            roomPolygon,
                        )
                    }
                    roomPolygon={roomPolygon}
                    onSaveRoom={(polygon) =>
                        saveLayout(currentPositions, polygon)
                    }
                    readOnly={!canUpdate}
                />
            )}

            <TableFormDialog
                open={showForm}
                table={editingTable}
                pending={createMutation.isPending || updateMutation.isPending}
                onOpenChange={(open) => {
                    setShowForm(open);
                    if (!open) setEditingTable(null);
                }}
                onSave={handleSave}
            />
            <AssignGuestDialog
                table={assignTable}
                guests={guests}
                pending={assignMutation.isPending}
                onOpenChange={(open) => {
                    if (!open) setAssignTable(null);
                }}
                onAssign={(guestId, tableId) =>
                    assignMutation.mutate({ guestId, tableId })
                }
            />
        </div>
    );
}
