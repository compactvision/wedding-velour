import { Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    CircleDollarSign,
    Clock3,
    CreditCard,
    Download,
    ReceiptText,
} from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Transaction = {
    id: string;
    reference: string;
    plan: string | null;
    amount_minor: number;
    currency: string;
    status: string;
    provider: string;
    paid_at: string | null;
    created_at: string;
    receipt_url: string | null;
};

type Response = {
    data: {
        summary: {
            paid_minor: number;
            paid_count: number;
            pending_count: number;
            currency: string;
        };
        transactions: Transaction[];
    };
};

const money = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
        amount / 100,
    );

const statusLabel: Record<string, string> = {
    paid: 'Payé',
    pending: 'En attente',
    failed: 'Échoué',
    cancelled: 'Annulé',
};

export default function Transactions() {
    const { props, url } = usePage();
    const workspace = (props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const endpoint = `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/transactions`;
    const query = useQuery({
        queryKey: ['transactions', workspace?.event?.id],
        queryFn: async () => (await axios.get<Response>(endpoint)).data.data,
        enabled: Boolean(workspace?.event?.id),
    });
    const paymentResult = new URLSearchParams(url.split('?')[1] || '').get(
        'payment',
    );

    if (!workspace) {
        return (
            <EmptyState
                icon={ReceiptText}
                title="Aucun événement actif"
                description="Sélectionnez un événement pour consulter ses transactions."
                actionLabel="Choisir un événement"
                actionHref="/onboarding"
            />
        );
    }

    const data = query.data;

    return (
        <div>
            <PageHeader
                title="Mes transactions"
                subtitle="Retrouvez tous vos paiements et téléchargez vos reçus."
            >
                <Button asChild>
                    <Link href="/checkout">
                        <CreditCard className="mr-2 h-4 w-4" /> Effectuer un
                        paiement
                    </Link>
                </Button>
            </PageHeader>

            {paymentResult === 'success' && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Paiement transmis. La transaction sera confirmée dès la
                    réception sécurisée du retour RDCARD.
                </div>
            )}
            {paymentResult === 'cancelled' && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Le paiement a été annulé. Aucun montant confirmé n’a été
                    encaissé.
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    icon={CircleDollarSign}
                    label="Total payé"
                    value={money(
                        data?.summary.paid_minor || 0,
                        data?.summary.currency,
                    )}
                />
                <SummaryCard
                    icon={CreditCard}
                    label="Paiements confirmés"
                    value={data?.summary.paid_count || 0}
                />
                <SummaryCard
                    icon={Clock3}
                    label="En attente"
                    value={data?.summary.pending_count || 0}
                />
            </section>

            <Card className="mt-6 overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-4">Transaction</th>
                                    <th className="px-5 py-4">Pack</th>
                                    <th className="px-5 py-4">Montant</th>
                                    <th className="px-5 py-4">Statut</th>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4 text-right">
                                        Reçu
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(data?.transactions || []).map(
                                    (transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="px-5 py-4">
                                                <p className="font-medium">
                                                    {transaction.reference}
                                                </p>
                                                <p className="text-xs text-muted-foreground uppercase">
                                                    {transaction.provider}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                {transaction.plan || '—'}
                                            </td>
                                            <td className="px-5 py-4 font-semibold">
                                                {money(
                                                    transaction.amount_minor,
                                                    transaction.currency,
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge
                                                    variant={
                                                        transaction.status ===
                                                        'paid'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {statusLabel[
                                                        transaction.status
                                                    ] || transaction.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {new Date(
                                                    transaction.paid_at ||
                                                        transaction.created_at,
                                                ).toLocaleString('fr-FR')}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {transaction.receipt_url ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={
                                                                transaction.receipt_url
                                                            }
                                                        >
                                                            <Download className="mr-2 h-4 w-4" />{' '}
                                                            Télécharger
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Après confirmation
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ),
                                )}
                                {!query.isLoading &&
                                    (data?.transactions.length || 0) === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-5 py-12 text-center text-muted-foreground"
                                            >
                                                Aucune transaction pour cet
                                                événement.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }: any) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
