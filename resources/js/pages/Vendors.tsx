import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CalendarClock,
    CircleDollarSign,
    FileSignature,
    Handshake,
    Plus,
} from 'lucide-react';
import React, { useState } from 'react';
import { tenantVendors } from '@/api/tenantClient';
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

const contractLabels = {
    draft: 'Brouillon',
    pending: 'À approuver',
    signed: 'Signé',
    active: 'Actif',
    completed: 'Terminé',
    cancelled: 'Annulé',
};

function money(minor: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(minor / 100);
}

export default function VendorsPage() {
    const workspace = (usePage().props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('vendors.manage');
    const canContract =
        permissions.includes('*') || permissions.includes('contracts.manage');
    const canApprove =
        permissions.includes('*') ||
        permissions.includes('contracts.approve');
    const queryClient = useQueryClient();
    const [vendorOpen, setVendorOpen] = useState(false);
    const [contractOpen, setContractOpen] = useState(false);
    const [vendor, setVendor] = useState({
        name: '',
        category: '',
        contact_name: '',
        email: '',
        phone: '',
    });
    const [contract, setContract] = useState({
        event_vendor_id: '',
        title: '',
        scope: '',
        value: '',
        starts_on: '',
        ends_on: '',
        installment_label: 'Acompte',
        installment_amount: '',
        installment_due_on: '',
    });

    const vendorsQuery = useQuery({
        queryKey: ['tenant-vendors', eventId],
        queryFn: () => tenantVendors.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const data = vendorsQuery.data?.data;
    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['tenant-vendors', eventId],
        });
    const vendorMutation = useMutation({
        mutationFn: () =>
            tenantVendors.createVendor(organizationSlug, eventSlug, {
                name: vendor.name,
                category: vendor.category,
                contact_name: vendor.contact_name || undefined,
                email: vendor.email || undefined,
                phone: vendor.phone || undefined,
            }),
        onSuccess: () => {
            setVendorOpen(false);
            setVendor({
                name: '',
                category: '',
                contact_name: '',
                email: '',
                phone: '',
            });
            refresh();
        },
    });
    const contractMutation = useMutation({
        mutationFn: () =>
            tenantVendors.createContract(organizationSlug, eventSlug, {
                event_vendor_id: contract.event_vendor_id,
                title: contract.title,
                scope: contract.scope || undefined,
                value_minor: Math.round(Number(contract.value) * 100),
                starts_on: contract.starts_on || undefined,
                ends_on: contract.ends_on || undefined,
                installments: contract.installment_amount
                    ? [
                          {
                              label: contract.installment_label,
                              amount_minor: Math.round(
                                  Number(contract.installment_amount) * 100,
                              ),
                              due_on:
                                  contract.installment_due_on || undefined,
                          },
                      ]
                    : [],
            }),
        onSuccess: () => {
            setContractOpen(false);
            setContract({
                event_vendor_id: '',
                title: '',
                scope: '',
                value: '',
                starts_on: '',
                ends_on: '',
                installment_label: 'Acompte',
                installment_amount: '',
                installment_due_on: '',
            });
            refresh();
        },
    });
    const transitionMutation = useMutation({
        mutationFn: ({
            id,
            action,
        }: {
            id: string;
            action: 'submit' | 'sign' | 'activate' | 'complete' | 'cancel';
        }) =>
            tenantVendors.transitionContract(
                organizationSlug,
                eventSlug,
                id,
                action,
            ),
        onSuccess: refresh,
    });
    const paymentMutation = useMutation({
        mutationFn: (id: string) =>
            tenantVendors.markInstallmentPaid(
                organizationSlug,
                eventSlug,
                id,
            ),
        onSuccess: refresh,
    });

    if (!workspace) {
        return (
            <EmptyState
                icon={Handshake}
                title="Choisissez un événement"
                description="Activez un espace Planivo pour gérer ses prestataires."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (vendorsQuery.isError) {
        return (
            <EmptyState
                icon={Handshake}
                title="Prestataires indisponibles"
                description="Activez les modules Prestataires et Contrats."
                actionLabel="Retour à l’espace"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const currency =
        data?.contracts[0]?.currency ||
        workspace.organization.currency ||
        'USD';
    const summary = data?.summary || {
        vendor_count: 0,
        active_contracts: 0,
        contracted_minor: 0,
        paid_minor: 0,
        remaining_minor: 0,
        overdue_installments: 0,
    };

    return (
        <div>
            <PageHeader
                title="Prestataires & contrats"
                subtitle={`${workspace.event.name} · engagements et échéances`}
            >
                <Button variant="outline" asChild>
                    <Link href="/workspace">Aperçu événement</Link>
                </Button>
                {canContract && data?.vendors.length ? (
                    <Button
                        variant="outline"
                        onClick={() => setContractOpen(true)}
                    >
                        <FileSignature className="mr-2 h-4 w-4" />
                        Contrat
                    </Button>
                ) : null}
                {canManage && (
                    <Button onClick={() => setVendorOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Prestataire
                    </Button>
                )}
            </PageHeader>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Prestataires', summary.vendor_count, Handshake],
                    ['Contrats actifs', summary.active_contracts, FileSignature],
                    [
                        'Engagé',
                        money(summary.contracted_minor, currency),
                        CircleDollarSign,
                    ],
                    [
                        'Échéances en retard',
                        summary.overdue_installments,
                        CalendarClock,
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

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Prestataires</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!data?.vendors.length ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Ajoutez votre premier prestataire.
                            </p>
                        ) : (
                            data.vendors.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="rounded-xl border p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">
                                                {entry.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.category} ·{' '}
                                                {entry.contact_name ||
                                                    'Contact à compléter'}
                                            </div>
                                        </div>
                                        <Badge variant="outline">
                                            {entry.contracts_count} contrat(s)
                                        </Badge>
                                    </div>
                                    {(entry.email || entry.phone) && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {entry.email || entry.phone}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contrats & paiements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!data?.contracts.length ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Aucun contrat enregistré.
                            </p>
                        ) : (
                            data.contracts.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">
                                                {entry.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.reference} ·{' '}
                                                {entry.vendor_name}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline">
                                                {contractLabels[entry.status]}
                                            </Badge>
                                            <div className="mt-1 font-semibold">
                                                {money(
                                                    entry.value_minor,
                                                    entry.currency,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{
                                                width: `${Math.min(100, (entry.paid_minor / entry.value_minor) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Payé{' '}
                                        {money(
                                            entry.paid_minor,
                                            entry.currency,
                                        )}{' '}
                                        · restant{' '}
                                        {money(
                                            entry.remaining_minor,
                                            entry.currency,
                                        )}
                                    </div>
                                    {entry.installments.map((installment) => (
                                        <div
                                            key={installment.id}
                                            className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-2"
                                        >
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    {installment.label}
                                                </span>{' '}
                                                ·{' '}
                                                {money(
                                                    installment.amount_minor,
                                                    entry.currency,
                                                )}
                                                {installment.due_on
                                                    ? ` · ${installment.due_on}`
                                                    : ''}
                                            </div>
                                            {canApprove &&
                                                installment.status ===
                                                    'pending' &&
                                                ['signed', 'active'].includes(
                                                    entry.status,
                                                ) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            paymentMutation.mutate(
                                                                installment.id,
                                                            )
                                                        }
                                                    >
                                                        Marquer payé
                                                    </Button>
                                                )}
                                        </div>
                                    ))}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {canContract &&
                                            entry.status === 'draft' && (
                                                <Action
                                                    label="Soumettre"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                id: entry.id,
                                                                action: 'submit',
                                                            },
                                                        )
                                                    }
                                                />
                                            )}
                                        {canApprove &&
                                            entry.status === 'pending' && (
                                                <Action
                                                    label="Signer"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                id: entry.id,
                                                                action: 'sign',
                                                            },
                                                        )
                                                    }
                                                />
                                            )}
                                        {canContract &&
                                            entry.status === 'signed' && (
                                                <Action
                                                    label="Activer"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                id: entry.id,
                                                                action: 'activate',
                                                            },
                                                        )
                                                    }
                                                />
                                            )}
                                        {canApprove &&
                                            ['signed', 'active'].includes(
                                                entry.status,
                                            ) && (
                                                <Action
                                                    label="Clôturer"
                                                    variant="outline"
                                                    onClick={() =>
                                                        transitionMutation.mutate(
                                                            {
                                                                id: entry.id,
                                                                action: 'complete',
                                                            },
                                                        )
                                                    }
                                                />
                                            )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau prestataire</DialogTitle>
                    </DialogHeader>
                    <Field label="Entreprise">
                        <Input
                            value={vendor.name}
                            onChange={(event) =>
                                setVendor({
                                    ...vendor,
                                    name: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Catégorie de prestation">
                        <Input
                            placeholder="Traiteur, photographe, décoration…"
                            value={vendor.category}
                            onChange={(event) =>
                                setVendor({
                                    ...vendor,
                                    category: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Personne de contact">
                        <Input
                            value={vendor.contact_name}
                            onChange={(event) =>
                                setVendor({
                                    ...vendor,
                                    contact_name: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="E-mail">
                            <Input
                                type="email"
                                value={vendor.email}
                                onChange={(event) =>
                                    setVendor({
                                        ...vendor,
                                        email: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Téléphone">
                            <Input
                                value={vendor.phone}
                                onChange={(event) =>
                                    setVendor({
                                        ...vendor,
                                        phone: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => vendorMutation.mutate()}
                            disabled={
                                !vendor.name ||
                                !vendor.category ||
                                vendorMutation.isPending
                            }
                        >
                            Ajouter
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={contractOpen} onOpenChange={setContractOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nouveau contrat</DialogTitle>
                    </DialogHeader>
                    <Field label="Prestataire">
                        <Select
                            value={contract.event_vendor_id}
                            onValueChange={(value) =>
                                setContract({
                                    ...contract,
                                    event_vendor_id: value,
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                {data?.vendors.map((entry) => (
                                    <SelectItem key={entry.id} value={entry.id}>
                                        {entry.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Objet du contrat">
                        <Input
                            value={contract.title}
                            onChange={(event) =>
                                setContract({
                                    ...contract,
                                    title: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <Field label="Périmètre de la prestation">
                        <Textarea
                            value={contract.scope}
                            onChange={(event) =>
                                setContract({
                                    ...contract,
                                    scope: event.target.value,
                                })
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label={`Valeur (${currency})`}>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={contract.value}
                                onChange={(event) =>
                                    setContract({
                                        ...contract,
                                        value: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Début">
                            <Input
                                type="date"
                                value={contract.starts_on}
                                onChange={(event) =>
                                    setContract({
                                        ...contract,
                                        starts_on: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field label="Fin">
                            <Input
                                type="date"
                                value={contract.ends_on}
                                onChange={(event) =>
                                    setContract({
                                        ...contract,
                                        ends_on: event.target.value,
                                    })
                                }
                            />
                        </Field>
                    </div>
                    <div className="rounded-xl border p-3">
                        <div className="mb-3 text-sm font-semibold">
                            Première échéance
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Libellé">
                                <Input
                                    value={contract.installment_label}
                                    onChange={(event) =>
                                        setContract({
                                            ...contract,
                                            installment_label:
                                                event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field label={`Montant (${currency})`}>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={contract.installment_amount}
                                    onChange={(event) =>
                                        setContract({
                                            ...contract,
                                            installment_amount:
                                                event.target.value,
                                        })
                                    }
                                />
                            </Field>
                            <Field label="Échéance">
                                <Input
                                    type="date"
                                    value={contract.installment_due_on}
                                    onChange={(event) =>
                                        setContract({
                                            ...contract,
                                            installment_due_on:
                                                event.target.value,
                                        })
                                    }
                                />
                            </Field>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => contractMutation.mutate()}
                            disabled={
                                !contract.event_vendor_id ||
                                !contract.title ||
                                !contract.value ||
                                contractMutation.isPending
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

function Action({
    label,
    onClick,
    variant = 'default',
}: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
}) {
    return (
        <Button size="sm" variant={variant} onClick={onClick}>
            {label}
        </Button>
    );
}
