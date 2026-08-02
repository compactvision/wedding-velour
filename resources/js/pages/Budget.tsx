import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BadgeCheck,
    Banknote,
    Plus,
    ReceiptText,
    Trash2,
    WalletCards,
} from 'lucide-react';
import React, { useState } from 'react';
import { tenantBudget } from '@/api/tenantClient';
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
import { cn } from '@/lib/utils';

const statusLabels = {
    planned: 'Prévue',
    pending: 'À valider',
    approved: 'Approuvée',
    paid: 'Payée',
    rejected: 'Refusée',
};

function money(minor: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(minor / 100);
}

export default function BudgetPage() {
    const workspace = (usePage().props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('budget.manage');
    const canApprove =
        permissions.includes('*') || permissions.includes('expenses.approve');
    const queryClient = useQueryClient();
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [category, setCategory] = useState({
        name: '',
        color: '#B98235',
        amount: '',
    });
    const [expense, setExpense] = useState({
        title: '',
        vendor_name: '',
        amount: '',
        budget_category_id: '',
        status: 'planned' as 'planned' | 'pending',
        due_on: '',
        notes: '',
    });

    const budgetQuery = useQuery({
        queryKey: ['tenant-budget', eventId],
        queryFn: () => tenantBudget.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const data = budgetQuery.data?.data;
    const refresh = () =>
        queryClient.invalidateQueries({ queryKey: ['tenant-budget', eventId] });
    const categoryMutation = useMutation({
        mutationFn: () =>
            tenantBudget.createCategory(organizationSlug, eventSlug, {
                name: category.name,
                color: category.color,
                planned_minor: Math.round(Number(category.amount) * 100),
            }),
        onSuccess: () => {
            setCategoryOpen(false);
            setCategory({ name: '', color: '#B98235', amount: '' });
            refresh();
        },
    });
    const expenseMutation = useMutation({
        mutationFn: () =>
            tenantBudget.createExpense(organizationSlug, eventSlug, {
                title: expense.title,
                vendor_name: expense.vendor_name || undefined,
                amount_minor: Math.round(Number(expense.amount) * 100),
                budget_category_id:
                    expense.budget_category_id || undefined,
                status: expense.status,
                due_on: expense.due_on || undefined,
                notes: expense.notes || undefined,
            }),
        onSuccess: () => {
            setExpenseOpen(false);
            setExpense({
                title: '',
                vendor_name: '',
                amount: '',
                budget_category_id: '',
                status: 'planned',
                due_on: '',
                notes: '',
            });
            refresh();
        },
    });
    const approveMutation = useMutation({
        mutationFn: ({
            id,
            status,
        }: {
            id: string;
            status: 'approved' | 'paid' | 'rejected';
        }) =>
            tenantBudget.approveExpense(
                organizationSlug,
                eventSlug,
                id,
                status,
            ),
        onSuccess: refresh,
    });
    const deleteExpenseMutation = useMutation({
        mutationFn: (id: string) =>
            tenantBudget.deleteExpense(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });
    const deleteCategoryMutation = useMutation({
        mutationFn: (id: string) =>
            tenantBudget.deleteCategory(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });

    if (!workspace) {
        return (
            <EmptyState
                icon={WalletCards}
                title="Choisissez un événement"
                description="Activez un espace Planivo pour gérer son budget."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (budgetQuery.isError) {
        return (
            <EmptyState
                icon={WalletCards}
                title="Budget indisponible"
                description="Activez le module Budget pour cet événement."
                actionLabel="Retour à l’espace"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const currency = data?.budget.currency || 'USD';
    const summary = data?.summary || {
        planned_minor: 0,
        committed_minor: 0,
        paid_minor: 0,
        pending_minor: 0,
        remaining_minor: 0,
    };

    return (
        <div>
            <PageHeader
                title="Budget & dépenses"
                subtitle={`${workspace.event.name} · suivi financier en ${currency}`}
            >
                <Button variant="outline" asChild>
                    <Link href="/workspace">Aperçu événement</Link>
                </Button>
                {canManage && (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setCategoryOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Catégorie
                        </Button>
                        <Button onClick={() => setExpenseOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Dépense
                        </Button>
                    </>
                )}
            </PageHeader>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'Budget prévu',
                        value: summary.planned_minor,
                        icon: WalletCards,
                    },
                    {
                        label: 'Engagé',
                        value: summary.committed_minor,
                        icon: ReceiptText,
                    },
                    {
                        label: 'Payé',
                        value: summary.paid_minor,
                        icon: BadgeCheck,
                    },
                    {
                        label: 'Disponible',
                        value: summary.remaining_minor,
                        icon: Banknote,
                    },
                ].map(({ label, value, icon: Icon }) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <Icon
                                className={cn(
                                    'h-5 w-5',
                                    value < 0
                                        ? 'text-destructive'
                                        : 'text-primary',
                                )}
                            />
                            <div>
                                <div
                                    className={cn(
                                        'text-lg font-bold',
                                        value < 0 && 'text-destructive',
                                    )}
                                >
                                    {money(value, currency)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {label}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg">Répartition prévue</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(data?.categories || []).map((item) => {
                        const percentage =
                            item.planned_minor > 0
                                ? Math.min(
                                      100,
                                      Math.round(
                                          (item.committed_minor /
                                              item.planned_minor) *
                                              100,
                                      ),
                                  )
                                : 0;

                        return (
                            <div key={item.id} className="rounded-xl border p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        {item.name}
                                    </span>
                                    {canManage && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                deleteCategoryMutation.mutate(
                                                    item.id,
                                                )
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {money(item.committed_minor, currency)} sur{' '}
                                    {money(item.planned_minor, currency)}
                                </p>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: item.color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {data?.categories.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Ajoutez vos premières catégories budgétaires.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg">Dépenses</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                    {(data?.expenses || []).map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                            <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {item.category_name || 'Sans catégorie'}
                                    {item.vendor_name
                                        ? ` · ${item.vendor_name}`
                                        : ''}
                                    {item.due_on ? ` · échéance ${item.due_on}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <strong>
                                    {money(item.amount_minor, item.currency)}
                                </strong>
                                <Badge variant="secondary">
                                    {statusLabels[item.status]}
                                </Badge>
                                {canApprove &&
                                    ['planned', 'pending'].includes(
                                        item.status,
                                    ) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                approveMutation.mutate({
                                                    id: item.id,
                                                    status: 'approved',
                                                })
                                            }
                                        >
                                            Approuver
                                        </Button>
                                    )}
                                {canApprove && item.status === 'approved' && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            approveMutation.mutate({
                                                id: item.id,
                                                status: 'paid',
                                            })
                                        }
                                    >
                                        Marquer payée
                                    </Button>
                                )}
                                {canManage && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            deleteExpenseMutation.mutate(item.id)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {data?.expenses.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Aucune dépense enregistrée.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle catégorie</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nom</Label>
                            <Input
                                value={category.name}
                                onChange={(event) =>
                                    setCategory({
                                        ...category,
                                        name: event.target.value,
                                    })
                                }
                                placeholder="Lieu et réception"
                            />
                        </div>
                        <div>
                            <Label>Montant prévu ({currency})</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={category.amount}
                                onChange={(event) =>
                                    setCategory({
                                        ...category,
                                        amount: event.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCategoryOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={
                                !category.name ||
                                !category.amount ||
                                categoryMutation.isPending
                            }
                            onClick={() => categoryMutation.mutate()}
                        >
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouvelle dépense</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label>Libellé</Label>
                            <Input
                                value={expense.title}
                                onChange={(event) =>
                                    setExpense({
                                        ...expense,
                                        title: event.target.value,
                                    })
                                }
                                placeholder="Acompte salle"
                            />
                        </div>
                        <div>
                            <Label>Prestataire</Label>
                            <Input
                                value={expense.vendor_name}
                                onChange={(event) =>
                                    setExpense({
                                        ...expense,
                                        vendor_name: event.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>Montant ({currency})</Label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={expense.amount}
                                onChange={(event) =>
                                    setExpense({
                                        ...expense,
                                        amount: event.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>Catégorie</Label>
                            <Select
                                value={expense.budget_category_id || 'none'}
                                onValueChange={(value) =>
                                    setExpense({
                                        ...expense,
                                        budget_category_id:
                                            value === 'none' ? '' : value,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Sans catégorie
                                    </SelectItem>
                                    {data?.categories.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Statut initial</Label>
                            <Select
                                value={expense.status}
                                onValueChange={(
                                    status: 'planned' | 'pending',
                                ) => setExpense({ ...expense, status })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="planned">
                                        Prévue
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        À valider
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Échéance</Label>
                            <Input
                                type="date"
                                value={expense.due_on}
                                onChange={(event) =>
                                    setExpense({
                                        ...expense,
                                        due_on: event.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={expense.notes}
                                onChange={(event) =>
                                    setExpense({
                                        ...expense,
                                        notes: event.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setExpenseOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={
                                !expense.title ||
                                !expense.amount ||
                                expenseMutation.isPending
                            }
                            onClick={() => expenseMutation.mutate()}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
