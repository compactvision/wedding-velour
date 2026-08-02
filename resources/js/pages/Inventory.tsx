import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    PackagePlus,
    Plus,
    ReceiptText,
    Truck,
} from 'lucide-react';
import React, { useState } from 'react';
import { tenantInventory } from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';

const orderLabels = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    approved: 'Approuvé',
    received: 'Réceptionné',
    cancelled: 'Annulé',
};

const movementLabels = {
    receipt: 'Entrée',
    issue: 'Sortie',
    adjustment: 'Ajustement',
};

function money(minor: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(minor / 100);
}

export default function InventoryPage() {
    const workspace = (usePage().props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('stock.manage');
    const canPurchase =
        permissions.includes('*') || permissions.includes('purchasing.manage');
    const canApprove =
        permissions.includes('*') ||
        permissions.includes('purchasing.approve');
    const queryClient = useQueryClient();
    const [itemOpen, setItemOpen] = useState(false);
    const [movementOpen, setMovementOpen] = useState(false);
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [item, setItem] = useState({
        name: '',
        sku: '',
        category: '',
        unit: 'unité',
        reorder_level: '',
        unit_cost: '',
        location: '',
    });
    const [movement, setMovement] = useState({
        type: 'receipt' as 'receipt' | 'issue' | 'adjustment',
        quantity: '',
        reason: '',
    });
    const [supplier, setSupplier] = useState({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
    });
    const [purchase, setPurchase] = useState({
        supplier_id: '',
        inventory_item_id: '',
        quantity: '',
        unit_cost: '',
        expected_on: '',
        notes: '',
    });

    const inventoryQuery = useQuery({
        queryKey: ['tenant-inventory', eventId],
        queryFn: () => tenantInventory.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const data = inventoryQuery.data?.data;
    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['tenant-inventory', eventId],
        });
    const itemMutation = useMutation({
        mutationFn: () =>
            tenantInventory.createItem(organizationSlug, eventSlug, {
                name: item.name,
                sku: item.sku || undefined,
                category: item.category || undefined,
                unit: item.unit,
                reorder_level: Number(item.reorder_level || 0),
                unit_cost_minor: Math.round(Number(item.unit_cost || 0) * 100),
                location: item.location || undefined,
            }),
        onSuccess: () => {
            setItemOpen(false);
            setItem({
                name: '',
                sku: '',
                category: '',
                unit: 'unité',
                reorder_level: '',
                unit_cost: '',
                location: '',
            });
            refresh();
        },
    });
    const movementMutation = useMutation({
        mutationFn: () =>
            tenantInventory.move(
                organizationSlug,
                eventSlug,
                selectedItemId,
                {
                    type: movement.type,
                    quantity: Number(movement.quantity),
                    reason: movement.reason || undefined,
                },
            ),
        onSuccess: () => {
            setMovementOpen(false);
            setMovement({ type: 'receipt', quantity: '', reason: '' });
            refresh();
        },
    });
    const supplierMutation = useMutation({
        mutationFn: () =>
            tenantInventory.createSupplier(
                organizationSlug,
                eventSlug,
                {
                    name: supplier.name,
                    contact_name: supplier.contact_name || undefined,
                    email: supplier.email || undefined,
                    phone: supplier.phone || undefined,
                },
            ),
        onSuccess: () => {
            setSupplierOpen(false);
            setSupplier({ name: '', contact_name: '', email: '', phone: '' });
            refresh();
        },
    });
    const purchaseMutation = useMutation({
        mutationFn: () =>
            tenantInventory.createPurchaseOrder(
                organizationSlug,
                eventSlug,
                {
                    supplier_id: purchase.supplier_id || undefined,
                    expected_on: purchase.expected_on || undefined,
                    notes: purchase.notes || undefined,
                    items: [
                        {
                            inventory_item_id: purchase.inventory_item_id,
                            quantity: Number(purchase.quantity),
                            unit_cost_minor: Math.round(
                                Number(purchase.unit_cost) * 100,
                            ),
                        },
                    ],
                },
            ),
        onSuccess: () => {
            setPurchaseOpen(false);
            setPurchase({
                supplier_id: '',
                inventory_item_id: '',
                quantity: '',
                unit_cost: '',
                expected_on: '',
                notes: '',
            });
            refresh();
        },
    });
    const transitionMutation = useMutation({
        mutationFn: ({
            orderId,
            action,
        }: {
            orderId: string;
            action: 'submit' | 'approve' | 'receive' | 'cancel';
        }) =>
            tenantInventory.transitionPurchaseOrder(
                organizationSlug,
                eventSlug,
                orderId,
                action,
            ),
        onSuccess: refresh,
    });

    if (!workspace) {
        return (
            <EmptyState
                icon={Boxes}
                title="Choisissez un événement"
                description="Activez un espace Planivo pour gérer son stock."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (inventoryQuery.isError) {
        return (
            <EmptyState
                icon={Boxes}
                title="Stock indisponible"
                description="Activez les modules Stock et Achats pour cet événement."
                actionLabel="Retour à l’espace"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const currency = data?.items[0]?.currency || workspace.organization.currency || 'USD';
    const summary = data?.summary || {
        item_count: 0,
        low_stock_count: 0,
        stock_value_minor: 0,
        open_purchase_orders: 0,
    };

    return (
        <div>
            <PageHeader
                title="Stock & achats"
                subtitle={`${workspace.event.name} · inventaire et approvisionnements`}
            >
                <Button variant="outline" asChild>
                    <Link href="/workspace">Aperçu événement</Link>
                </Button>
                {canPurchase && (
                    <Button
                        variant="outline"
                        onClick={() => setSupplierOpen(true)}
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        Fournisseur
                    </Button>
                )}
                {canManage && (
                    <Button onClick={() => setItemOpen(true)}>
                        <PackagePlus className="mr-2 h-4 w-4" />
                        Article
                    </Button>
                )}
            </PageHeader>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Articles', summary.item_count, Boxes],
                    ['Stock faible', summary.low_stock_count, AlertTriangle],
                    [
                        'Valeur du stock',
                        money(summary.stock_value_minor, currency),
                        ReceiptText,
                    ],
                    [
                        'Achats ouverts',
                        summary.open_purchase_orders,
                        Truck,
                    ],
                ].map(([label, value, Icon]: any) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <div>
                                <div className="text-lg font-bold">{value}</div>
                                <div className="text-xs text-muted-foreground">
                                    {label}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Articles en stock</CardTitle>
                        {canPurchase && data?.items.length ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPurchaseOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Achat
                            </Button>
                        ) : null}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!data?.items.length ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Ajoutez votre premier article pour suivre les
                                quantités.
                            </p>
                        ) : (
                            data.items.map((stockItem) => {
                                const low =
                                    Number(stockItem.current_quantity) <=
                                    Number(stockItem.reorder_level);

                                return (
                                    <div
                                        key={stockItem.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 font-medium">
                                                {stockItem.name}
                                                {low && (
                                                    <Badge variant="destructive">
                                                        Stock faible
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {stockItem.sku || 'Sans SKU'} ·{' '}
                                                {stockItem.location ||
                                                    'Emplacement libre'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="font-semibold">
                                                    {Number(
                                                        stockItem.current_quantity,
                                                    )}{' '}
                                                    {stockItem.unit}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    seuil{' '}
                                                    {Number(
                                                        stockItem.reorder_level,
                                                    )}
                                                </div>
                                            </div>
                                            {canManage && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedItemId(
                                                            stockItem.id,
                                                        );
                                                        setMovementOpen(true);
                                                    }}
                                                >
                                                    Mouvement
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Commandes d’achat</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!data?.purchase_orders.length ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Aucun achat enregistré.
                            </p>
                        ) : (
                            data.purchase_orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="rounded-xl border p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">
                                                {order.reference}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {order.supplier_name ||
                                                    'Sans fournisseur'}{' '}
                                                · {order.items.length} ligne(s)
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline">
                                                {orderLabels[order.status]}
                                            </Badge>
                                            <div className="mt-1 text-sm font-semibold">
                                                {money(
                                                    order.total_minor,
                                                    order.currency,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {canPurchase &&
                                            order.status === 'draft' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                orderId:
                                                                    order.id,
                                                                action: 'submit',
                                                            },
                                                        )
                                                    }
                                                >
                                                    Soumettre
                                                </Button>
                                            )}
                                        {canApprove &&
                                            order.status === 'submitted' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                orderId:
                                                                    order.id,
                                                                action: 'approve',
                                                            },
                                                        )
                                                    }
                                                >
                                                    Approuver
                                                </Button>
                                            )}
                                        {canApprove &&
                                            order.status === 'approved' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                orderId:
                                                                    order.id,
                                                                action: 'receive',
                                                            },
                                                        )
                                                    }
                                                >
                                                    Réceptionner
                                                </Button>
                                            )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-5">
                <CardHeader>
                    <CardTitle>Derniers mouvements</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {data?.movements.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center gap-3 rounded-xl border p-3"
                        >
                            {entry.quantity_delta > 0 ? (
                                <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                            ) : (
                                <ArrowUpFromLine className="h-5 w-5 text-amber-600" />
                            )}
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                    {entry.item_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {movementLabels[entry.type]} ·{' '}
                                    {entry.quantity_delta > 0 ? '+' : ''}
                                    {entry.quantity_delta} · solde{' '}
                                    {entry.quantity_after}
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvel article</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nom">
                            <Input
                                value={item.name}
                                onChange={(event) =>
                                    setItem({ ...item, name: event.target.value })
                                }
                            />
                        </Field>
                        <Field label="SKU">
                            <Input
                                value={item.sku}
                                onChange={(event) =>
                                    setItem({ ...item, sku: event.target.value })
                                }
                            />
                        </Field>
                        <Field label="Catégorie">
                            <Input
                                value={item.category}
                                onChange={(event) =>
                                    setItem({
                                        ...item,
                                        category: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Unité">
                            <Input
                                value={item.unit}
                                onChange={(event) =>
                                    setItem({ ...item, unit: event.target.value })
                                }
                            />
                        </Field>
                        <Field label="Seuil d’alerte">
                            <Input
                                type="number"
                                min="0"
                                value={item.reorder_level}
                                onChange={(event) =>
                                    setItem({
                                        ...item,
                                        reorder_level: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label={`Coût unitaire (${currency})`}>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(event) =>
                                    setItem({
                                        ...item,
                                        unit_cost: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Emplacement">
                            <Input
                                value={item.location}
                                onChange={(event) =>
                                    setItem({
                                        ...item,
                                        location: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => itemMutation.mutate()}
                            disabled={!item.name || itemMutation.isPending}
                        >
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enregistrer un mouvement</DialogTitle>
                    </DialogHeader>
                    <Field label="Type">
                        <Select
                            value={movement.type}
                            onValueChange={(value: typeof movement.type) =>
                                setMovement({ ...movement, type: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="receipt">Entrée</SelectItem>
                                <SelectItem value="issue">Sortie</SelectItem>
                                <SelectItem value="adjustment">
                                    Ajustement signé
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Quantité">
                        <Input
                            type="number"
                            step="0.001"
                            value={movement.quantity}
                            onChange={(event) =>
                                setMovement({
                                    ...movement,
                                    quantity: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Motif">
                        <Textarea
                            value={movement.reason}
                            onChange={(event) =>
                                setMovement({
                                    ...movement,
                                    reason: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <DialogFooter>
                        <Button
                            onClick={() => movementMutation.mutate()}
                            disabled={
                                !movement.quantity ||
                                movementMutation.isPending
                            }
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau fournisseur</DialogTitle>
                    </DialogHeader>
                    <Field label="Entreprise">
                        <Input
                            value={supplier.name}
                            onChange={(event) =>
                                setSupplier({
                                    ...supplier,
                                    name: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Contact">
                        <Input
                            value={supplier.contact_name}
                            onChange={(event) =>
                                setSupplier({
                                    ...supplier,
                                    contact_name: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="E-mail">
                            <Input
                                type="email"
                                value={supplier.email}
                                onChange={(event) =>
                                    setSupplier({
                                        ...supplier,
                                        email: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Téléphone">
                            <Input
                                value={supplier.phone}
                                onChange={(event) =>
                                    setSupplier({
                                        ...supplier,
                                        phone: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => supplierMutation.mutate()}
                            disabled={
                                !supplier.name || supplierMutation.isPending
                            }
                        >
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle commande d’achat</DialogTitle>
                    </DialogHeader>
                    <Field label="Fournisseur">
                        <Select
                            value={purchase.supplier_id}
                            onValueChange={(value) =>
                                setPurchase({
                                    ...purchase,
                                    supplier_id: value,
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {data?.suppliers.map((entry) => (
                                    <SelectItem key={entry.id} value={entry.id}>
                                        {entry.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Article">
                        <Select
                            value={purchase.inventory_item_id}
                            onValueChange={(value) => {
                                const selected = data?.items.find(
                                    (entry) => entry.id === value,
                                );
                                setPurchase({
                                    ...purchase,
                                    inventory_item_id: value,
                                    unit_cost: selected
                                        ? String(selected.unit_cost_minor / 100)
                                        : '',
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {data?.items.map((entry) => (
                                    <SelectItem key={entry.id} value={entry.id}>
                                        {entry.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Quantité">
                            <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={purchase.quantity}
                                onChange={(event) =>
                                    setPurchase({
                                        ...purchase,
                                        quantity: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label={`Coût unitaire (${currency})`}>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={purchase.unit_cost}
                                onChange={(event) =>
                                    setPurchase({
                                        ...purchase,
                                        unit_cost: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                    <Field label="Réception prévue">
                        <Input
                            type="date"
                            value={purchase.expected_on}
                            onChange={(event) =>
                                setPurchase({
                                    ...purchase,
                                    expected_on: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Notes">
                        <Textarea
                            value={purchase.notes}
                            onChange={(event) =>
                                setPurchase({
                                    ...purchase,
                                    notes: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <DialogFooter>
                        <Button
                            onClick={() => purchaseMutation.mutate()}
                            disabled={
                                !purchase.inventory_item_id ||
                                !purchase.quantity ||
                                purchaseMutation.isPending
                            }
                        >
                            Créer le brouillon
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}
