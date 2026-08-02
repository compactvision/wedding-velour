import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Check,
    Clock3,
    CreditCard,
    FileText,
    ReceiptText,
    ShieldCheck,
    Puzzle,
    Settings2,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';
import type { BillingPlan, PricingQuote } from '@/api/tenantClient';
import { tenantBilling } from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function money(amountMinor: number | null, currency = 'USD') {
    if (amountMinor === null) {
        return 'Sur devis';
    }

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(amountMinor / 100);
}

function errorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return 'Impossible de générer ce devis.';
    }

    const errors = error.response?.data?.errors;
    const first = errors ? Object.values(errors).flat()[0] : null;

    return typeof first === 'string'
        ? first
        : error.response?.data?.message || 'Impossible de générer ce devis.';
}

export default function Billing() {
    const pageProps = usePage().props as any;
    const workspace = pageProps.workspace;
    const platformAdmin = Boolean(pageProps.auth?.platform_admin);
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('billing.manage');
    const queryClient = useQueryClient();
    const [selectedQuote, setSelectedQuote] = useState<PricingQuote | null>(
        null,
    );
    const [quoteError, setQuoteError] = useState('');
    const [paymentMessage, setPaymentMessage] = useState('');

    const billingQuery = useQuery({
        queryKey: ['tenant-billing', eventId],
        queryFn: () => tenantBilling.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const billing = billingQuery.data?.data;

    const quoteMutation = useMutation({
        mutationFn: (plan: BillingPlan) =>
            tenantBilling.quote(organizationSlug, eventSlug, plan.slug),
        onSuccess: (quote) => {
            setSelectedQuote(quote);
            setQuoteError('');
            queryClient.invalidateQueries({
                queryKey: ['tenant-billing', eventId],
            });
        },
        onError: (error) => setQuoteError(errorMessage(error)),
    });

    const paymentMutation = useMutation({
        mutationFn: (quote: PricingQuote) =>
            tenantBilling.createPayment(
                organizationSlug,
                eventSlug,
                quote.id,
                window.crypto.randomUUID(),
            ),
        onSuccess: (payment) => {
            setPaymentMessage(
                `Paiement ${payment.external_reference} créé. En attente de la confirmation sécurisée du prestataire.`,
            );
            setQuoteError('');
            queryClient.invalidateQueries({
                queryKey: ['tenant-billing', eventId],
            });
        },
        onError: (error) => setQuoteError(errorMessage(error)),
    });

    if (!workspace) {
        return (
            <EmptyState
                icon={CreditCard}
                title="Choisissez un événement"
                description="Activez un espace Planivo pour calculer son offre."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (billingQuery.isError) {
        return (
            <EmptyState
                icon={CreditCard}
                title="Tarification indisponible"
                description={errorMessage(billingQuery.error)}
                actionLabel="Retour à l’espace"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const metrics = billing?.metrics || {
        estimated_guests: 0,
        team_members: 0,
        enabled_modules: 0,
    };

    return (
        <div>
            <PageHeader
                title="Plans & tarification"
                subtitle={`${workspace.event.name} · estimation calculée par Planivo`}
            >
                {platformAdmin && (
                    <Button variant="outline" asChild>
                        <Link href="/settings/pricing">
                            <Settings2 className="mr-2 h-4 w-4" />
                            Configurer les prix
                        </Link>
                    </Button>
                )}
                <Button variant="outline" asChild>
                    <Link href="/workspace">Aperçu événement</Link>
                </Button>
            </PageHeader>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: 'Invités estimés',
                        value: metrics.estimated_guests,
                        icon: Users,
                    },
                    {
                        label: 'Collaborateurs',
                        value: metrics.team_members,
                        icon: Check,
                    },
                    {
                        label: 'Modules actifs',
                        value: metrics.enabled_modules,
                        icon: Puzzle,
                    },
                ].map(({ label, value, icon: Icon }) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <div>
                                <div className="text-xl font-bold">{value}</div>
                                <div className="text-xs text-muted-foreground">
                                    {label}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {billing?.subscription && (
                <Card className="mb-6 border-green-200 bg-green-50/60">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-green-700" />
                            <div>
                                <p className="font-semibold text-green-900">
                                    Abonnement {billing.subscription.plan_name}{' '}
                                    actif
                                </p>
                                <p className="text-sm text-green-800">
                                    Valable jusqu’au{' '}
                                    {new Date(
                                        billing.subscription.ends_at,
                                    ).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-green-700">Actif</Badge>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {(billing?.plans || []).map((plan) => {
                    const recommended = plan.slug === 'standard';

                    return (
                        <Card
                            key={plan.id}
                            className={cn(
                                'relative flex flex-col',
                                recommended && 'border-primary shadow-md',
                            )}
                        >
                            {recommended && (
                                <Badge className="absolute -top-3 left-4">
                                    Recommandé
                                </Badge>
                            )}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <p className="min-h-10 text-sm text-muted-foreground">
                                    {plan.description}
                                </p>
                                <div className="pt-2 text-3xl font-bold">
                                    {money(
                                        plan.estimated_total_minor,
                                        plan.currency,
                                    )}
                                </div>
                                {plan.billing_model !== 'enterprise' && (
                                    <p className="text-xs text-muted-foreground">
                                        forfait par événement
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col">
                                <div className="flex-1 space-y-2 text-sm">
                                    <p>
                                        <strong>
                                            {plan.limits.max_guests?.toLocaleString(
                                                'fr-FR',
                                            )}
                                        </strong>{' '}
                                        invités inclus
                                    </p>
                                    <p>
                                        <strong>{plan.limits.max_users}</strong>{' '}
                                        collaborateurs inclus
                                    </p>
                                    <p>
                                        <strong>
                                            {plan.limits.max_modules}
                                        </strong>{' '}
                                        modules inclus
                                    </p>
                                    <p>
                                        <strong>
                                            {plan.limits.storage_gb}
                                        </strong>{' '}
                                        Go de stockage
                                    </p>
                                </div>
                                {canManage &&
                                    plan.billing_model !== 'enterprise' && (
                                        <Button
                                            className="mt-5 w-full"
                                            disabled={quoteMutation.isPending}
                                            onClick={() =>
                                                quoteMutation.mutate(plan)
                                            }
                                        >
                                            Générer le devis
                                        </Button>
                                    )}
                                {plan.billing_model === 'enterprise' && (
                                    <Button
                                        className="mt-5 w-full"
                                        variant="outline"
                                        asChild
                                    >
                                        <a href="mailto:contact@planivo.app">
                                            Nous contacter
                                        </a>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {quoteError && (
                <p className="mt-5 text-sm text-destructive">{quoteError}</p>
            )}

            {selectedQuote && (
                <Card className="mt-7 border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Devis {selectedQuote.plan.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y rounded-xl border">
                            {selectedQuote.lines.map((line) => (
                                <div
                                    key={line.key}
                                    className="flex items-center justify-between gap-4 p-3 text-sm"
                                >
                                    <span>
                                        {line.label}
                                        {line.quantity > 1
                                            ? ` × ${line.quantity}`
                                            : ''}
                                    </span>
                                    <strong>
                                        {money(
                                            line.amount_minor,
                                            selectedQuote.currency,
                                        )}
                                    </strong>
                                </div>
                            ))}
                            <div className="flex items-center justify-between p-4 text-lg">
                                <strong>Total</strong>
                                <strong className="text-primary">
                                    {money(
                                        selectedQuote.total_minor,
                                        selectedQuote.currency,
                                    )}
                                </strong>
                            </div>
                        </div>
                        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            Valable jusqu’au{' '}
                            {new Date(selectedQuote.expires_at).toLocaleString(
                                'fr-FR',
                            )}
                        </p>
                        {canManage && selectedQuote.status === 'active' && (
                            <Button
                                className="mt-5 w-full sm:w-auto"
                                disabled={paymentMutation.isPending}
                                onClick={() =>
                                    paymentMutation.mutate(selectedQuote)
                                }
                            >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Procéder au paiement sécurisé
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {paymentMessage && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    {paymentMessage}
                </div>
            )}

            {(billing?.quotes.length || 0) > 0 && (
                <Card className="mt-7">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Historique des devis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {billing?.quotes.map((quote) => (
                            <button
                                key={quote.id}
                                className="flex w-full items-center justify-between gap-3 py-3 text-left"
                                onClick={() => setSelectedQuote(quote)}
                            >
                                <span>
                                    <span className="block font-medium">
                                        {quote.plan.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(
                                            quote.created_at,
                                        ).toLocaleString('fr-FR')}
                                    </span>
                                </span>
                                <strong>
                                    {money(quote.total_minor, quote.currency)}
                                </strong>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {(billing?.payments.length || 0) > 0 && (
                <Card className="mt-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Paiements
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {billing?.payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between gap-3 py-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {payment.plan_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {payment.external_reference}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">
                                        {money(
                                            payment.amount_minor,
                                            payment.currency,
                                        )}
                                    </p>
                                    <Badge
                                        variant={
                                            payment.status === 'paid'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {payment.status === 'paid'
                                            ? 'Payé'
                                            : payment.status === 'pending'
                                              ? 'En attente'
                                              : payment.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {(billing?.invoices.length || 0) > 0 && (
                <Card className="mt-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ReceiptText className="h-5 w-5 text-primary" />
                            Factures
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {billing?.invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="flex items-center justify-between gap-3 py-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {invoice.number}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(
                                            invoice.issued_at,
                                        ).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <strong>
                                    {money(
                                        invoice.total_minor,
                                        invoice.currency,
                                    )}
                                </strong>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
