import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    ChefHat,
    IceCream,
    Package,
    Pencil,
    Plus,
    Star,
    TableProperties,
    Trash2,
    UtensilsCrossed,
    Users,
    Wine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    CateringMenuItem,
    CateringMenuItemPayload,
    tenantCatering,
} from '@/api/tenantClient';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const categoryConfig: Record<
    CateringMenuItem['category'],
    { label: string; icon: LucideIcon; color: string; emoji: string }
> = {
    starter: {
        label: 'Entrées',
        icon: ChefHat,
        color: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
        emoji: '🥗',
    },
    food: {
        label: 'Plats',
        icon: UtensilsCrossed,
        color: 'border-orange-200 bg-orange-50/70 text-orange-700',
        emoji: '🍽️',
    },
    main: {
        label: 'Plats principaux',
        icon: UtensilsCrossed,
        color: 'border-orange-200 bg-orange-50/70 text-orange-700',
        emoji: '🍲',
    },
    dessert: {
        label: 'Desserts',
        icon: IceCream,
        color: 'border-pink-200 bg-pink-50/70 text-pink-700',
        emoji: '🍰',
    },
    drink: {
        label: 'Boissons',
        icon: Wine,
        color: 'border-blue-200 bg-blue-50/70 text-blue-700',
        emoji: '🥂',
    },
    special: {
        label: 'Spécial',
        icon: Star,
        color: 'border-purple-200 bg-purple-50/70 text-purple-700',
        emoji: '✨',
    },
};

const servicePeriods: Record<CateringMenuItem['service_period'], string> = {
    welcome: 'Accueil',
    starter: 'Entrées',
    main_service: 'Service principal',
    dessert: 'Dessert',
    late_service: 'Service tardif',
    continuous: 'Service continu',
};

const dietaryTagOptions = [
    'Végétarien',
    'Végétalien',
    'Sans gluten',
    'Sans lactose',
    'Halal',
    'Casher',
];

function listFromText(value: string): string[] {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

type MenuItemDialogProps = {
    open: boolean;
    item: CateringMenuItem | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: CateringMenuItemPayload) => void;
};

function MenuItemDialog({
    open,
    item,
    pending,
    onOpenChange,
    onSave,
}: MenuItemDialogProps) {
    const [form, setForm] = useState({
        name: '',
        emoji: '🍽️',
        category: 'food' as CateringMenuItem['category'],
        description: '',
        available_quantity: 0,
        is_available: true,
        allergens_text: '',
        dietary_tags: [] as string[],
        unit_price: '',
        service_period: 'main_service' as CateringMenuItem['service_period'],
    });

    useEffect(() => {
        setForm({
            name: item?.name || '',
            emoji:
                item?.emoji || categoryConfig[item?.category || 'food'].emoji,
            category: item?.category || 'food',
            description: item?.description || '',
            available_quantity: item?.available_quantity || 0,
            is_available: item?.is_available ?? true,
            allergens_text: (item?.allergens || []).join(', '),
            dietary_tags: item?.dietary_tags || [],
            unit_price:
                item?.unit_price !== null && item?.unit_price !== undefined
                    ? String(item.unit_price)
                    : '',
            service_period: item?.service_period || 'main_service',
        });
    }, [open, item]);

    const changeCategory = (category: CateringMenuItem['category']) =>
        setForm({
            ...form,
            category,
            emoji: item?.emoji || categoryConfig[category].emoji,
        });

    const submit = () =>
        onSave({
            name: form.name.trim(),
            emoji: form.emoji.trim() || null,
            category: form.category,
            description: form.description.trim() || null,
            available_quantity: form.available_quantity,
            is_available: form.is_available,
            allergens: listFromText(form.allergens_text),
            dietary_tags: form.dietary_tags,
            unit_price: form.unit_price ? Number(form.unit_price) : null,
            service_period: form.service_period,
        });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {item ? 'Modifier le menu' : 'Nouvel élément de menu'}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="menu-name">Nom</Label>
                        <Input
                            id="menu-name"
                            value={form.name}
                            onChange={(event) =>
                                setForm({ ...form, name: event.target.value })
                            }
                            placeholder="Poulet aux herbes"
                        />
                    </div>
                    <div>
                        <Label htmlFor="menu-emoji">Icône</Label>
                        <Input
                            id="menu-emoji"
                            value={form.emoji}
                            onChange={(event) =>
                                setForm({ ...form, emoji: event.target.value })
                            }
                            maxLength={20}
                        />
                    </div>
                    <div>
                        <Label>Catégorie</Label>
                        <Select
                            value={form.category}
                            onValueChange={changeCategory}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(categoryConfig).map(
                                    ([value, category]) => (
                                        <SelectItem key={value} value={value}>
                                            {category.emoji} {category.label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Période de service</Label>
                        <Select
                            value={form.service_period}
                            onValueChange={(
                                service_period: CateringMenuItem['service_period'],
                            ) => setForm({ ...form, service_period })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(servicePeriods).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="menu-description">Description</Label>
                        <Textarea
                            id="menu-description"
                            value={form.description}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value,
                                })
                            }
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label htmlFor="menu-quantity">
                            Quantité disponible
                        </Label>
                        <Input
                            id="menu-quantity"
                            type="number"
                            min={0}
                            value={form.available_quantity}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    available_quantity: Number(
                                        event.target.value,
                                    ),
                                })
                            }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            0 signifie quantité illimitée.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="menu-price">
                            Prix unitaire facultatif
                        </Label>
                        <Input
                            id="menu-price"
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.unit_price}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    unit_price: event.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="menu-allergens">
                            Allergènes, séparés par des virgules
                        </Label>
                        <Input
                            id="menu-allergens"
                            value={form.allergens_text}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    allergens_text: event.target.value,
                                })
                            }
                            placeholder="Arachides, lait, œufs"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Compatibilités alimentaires</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {dietaryTagOptions.map((tag) => {
                                const selected =
                                    form.dietary_tags.includes(tag);
                                return (
                                    <button
                                        type="button"
                                        key={tag}
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                dietary_tags: selected
                                                    ? form.dietary_tags.filter(
                                                          (value) =>
                                                              value !== tag,
                                                      )
                                                    : [
                                                          ...form.dietary_tags,
                                                          tag,
                                                      ],
                                            })
                                        }
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                                            selected
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground',
                                        )}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <Switch
                            checked={form.is_available}
                            onCheckedChange={(is_available) =>
                                setForm({ ...form, is_available })
                            }
                        />
                        <Label>
                            Disponible dans les invitations et à table
                        </Label>
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
                        onClick={submit}
                        disabled={!form.name.trim() || pending}
                    >
                        {pending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MenuAdmin() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const canManage = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('catering.manage'),
    );
    const queryClient = useQueryClient();
    const [view, setView] = useState<'catalogue' | 'tables'>('catalogue');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<CateringMenuItem | null>(
        null,
    );

    const cateringQuery = useQuery({
        queryKey: ['tenant-catering', eventId],
        queryFn: () => tenantCatering.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const catering = cateringQuery.data?.data;
    const items = catering?.menu_items || [];
    const tableNeeds = catering?.table_needs || [];

    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['tenant-catering', eventId],
        });
    const createMutation = useMutation({
        mutationFn: (data: CateringMenuItemPayload) =>
            tenantCatering.create(organizationSlug, eventSlug, data),
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
            data: CateringMenuItemPayload;
        }) => tenantCatering.update(organizationSlug, eventSlug, id, data),
        onSuccess: () => {
            refresh();
            setShowForm(false);
            setEditingItem(null);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            tenantCatering.delete(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });

    const handleSave = (data: CateringMenuItemPayload) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (!workspace) {
        return (
            <EmptyState
                icon={ChefHat}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de préparer ses menus."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (cateringQuery.isError) {
        return (
            <EmptyState
                icon={ChefHat}
                title="Module non disponible"
                description="Activez le module Repas et menus pour cet événement."
                actionLabel="Voir l’espace de travail"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const summary = catering?.summary || {
        menu_items: 0,
        available_items: 0,
        confirmed_people: 0,
        preference_selections: 0,
        dietary_alerts: 0,
        pending_orders: 0,
    };
    const stats: Array<{
        label: string;
        value: number;
        icon: LucideIcon;
        color: string;
    }> = [
        {
            label: 'Éléments disponibles',
            value: summary.available_items,
            icon: ChefHat,
            color: 'bg-orange-50 text-orange-700',
        },
        {
            label: 'Personnes confirmées',
            value: summary.confirmed_people,
            icon: Users,
            color: 'bg-blue-50 text-blue-700',
        },
        {
            label: 'Préférences reçues',
            value: summary.preference_selections,
            icon: UtensilsCrossed,
            color: 'bg-emerald-50 text-emerald-700',
        },
        {
            label: 'Alertes alimentaires',
            value: summary.dietary_alerts,
            icon: AlertTriangle,
            color: 'bg-amber-50 text-amber-700',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Repas, menus & restauration"
                subtitle={`${workspace.event.name} · ${summary.menu_items} éléments · ${summary.pending_orders} commandes en cours`}
            >
                <Button variant="outline" asChild>
                    <Link href="/onboarding">Changer d’événement</Link>
                </Button>
                {canManage && (
                    <Button
                        onClick={() => {
                            setEditingItem(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter au menu
                    </Button>
                )}
            </PageHeader>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn('rounded-xl p-2', color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {label}
                                </p>
                                <p className="text-2xl font-semibold">
                                    {value}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Tabs
                value={view}
                onValueChange={(value) =>
                    setView(value as 'catalogue' | 'tables')
                }
                className="mb-6"
            >
                <TabsList>
                    <TabsTrigger value="catalogue">
                        <ChefHat className="mr-2 h-4 w-4" />
                        Catalogue
                    </TabsTrigger>
                    <TabsTrigger value="tables">
                        <TableProperties className="mr-2 h-4 w-4" />
                        Préparation par table
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {cateringQuery.isLoading ? (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                    Chargement de la restauration…
                </Card>
            ) : view === 'catalogue' ? (
                items.length === 0 ? (
                    <EmptyState
                        icon={ChefHat}
                        title="Menu vide"
                        description="Ajoutez les plats, boissons et options proposés aux invités."
                        actionLabel={canManage ? 'Créer le menu' : undefined}
                        onAction={
                            canManage
                                ? () => {
                                      setEditingItem(null);
                                      setShowForm(true);
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => {
                            const config =
                                categoryConfig[item.category] ||
                                categoryConfig.special;
                            const Icon = config.icon;
                            const limited = item.available_quantity > 0;
                            return (
                                <Card
                                    key={item.id}
                                    className={cn(
                                        'flex flex-col border-2 p-5',
                                        !item.is_available && 'opacity-60',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3">
                                            <div
                                                className={cn(
                                                    'flex h-11 w-11 items-center justify-center rounded-xl border text-xl',
                                                    config.color,
                                                )}
                                            >
                                                {item.emoji || (
                                                    <Icon className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">
                                                    {item.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {config.label} ·{' '}
                                                    {
                                                        servicePeriods[
                                                            item.service_period
                                                        ]
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setShowForm(true);
                                                    }}
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
                                                                `Supprimer « ${item.name} » ? Les préférences associées seront retirées.`,
                                                            )
                                                        ) {
                                                            deleteMutation.mutate(
                                                                item.id,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        <Badge variant="secondary">
                                            {item.preference_count} préférence
                                            {item.preference_count > 1
                                                ? 's'
                                                : ''}
                                        </Badge>
                                        <Badge
                                            variant={
                                                item.is_available
                                                    ? 'outline'
                                                    : 'destructive'
                                            }
                                        >
                                            {item.is_available
                                                ? limited
                                                    ? `${item.remaining_quantity}/${item.available_quantity} disponibles`
                                                    : 'Illimité'
                                                : 'Indisponible'}
                                        </Badge>
                                        {item.dietary_tags.map((tag) => (
                                            <Badge key={tag} variant="outline">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    {item.allergens.length > 0 && (
                                        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
                                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            Allergènes :{' '}
                                            {item.allergens.join(', ')}
                                        </p>
                                    )}
                                    {item.unit_price !== null && (
                                        <p className="mt-auto pt-4 text-sm font-semibold">
                                            {item.unit_price.toLocaleString(
                                                'fr-FR',
                                            )}{' '}
                                            {workspace?.organization
                                                ?.currency || ''}
                                        </p>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )
            ) : tableNeeds.length === 0 ? (
                <EmptyState
                    icon={TableProperties}
                    title="Aucune table à préparer"
                    description="Placez d’abord les invités confirmés sur les tables."
                    actionLabel="Ouvrir le plan de salle"
                    onAction={() => window.location.assign('/tables')}
                />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {tableNeeds.map((table) => (
                        <Card key={table.table_id} className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {table.table_name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {table.people} personnes ·{' '}
                                        {table.guest_groups} groupes
                                    </p>
                                </div>
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Choix reçus
                                </p>
                                {Object.keys(table.preferences).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Aucun choix communiqué.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(table.preferences).map(
                                            ([name, count]) => (
                                                <Badge
                                                    key={name}
                                                    variant="secondary"
                                                >
                                                    {name} × {count}
                                                </Badge>
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>
                            {table.dietary_restrictions.length > 0 && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-800 uppercase">
                                        <AlertTriangle className="h-4 w-4" />
                                        Restrictions alimentaires
                                    </p>
                                    <ul className="space-y-1 text-sm text-amber-900">
                                        {table.dietary_restrictions.map(
                                            (restriction) => (
                                                <li key={restriction}>
                                                    {restriction}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <MenuItemDialog
                open={showForm}
                item={editingItem}
                pending={createMutation.isPending || updateMutation.isPending}
                onOpenChange={(open) => {
                    setShowForm(open);
                    if (!open) setEditingItem(null);
                }}
                onSave={handleSave}
            />
        </div>
    );
}
