import { Head, Link, router } from '@inertiajs/react';
import {
    CircleDollarSign,
    Download,
    Gauge,
    ReceiptText,
    Search,
    TimerReset,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Transaction = {
    id: string;
    reference: string;
    organization: string | null;
    event: string | null;
    plan: string | null;
    amount_minor: number;
    currency: string;
    status: string;
    provider: string;
    paid_at: string | null;
    created_at: string;
    receipt_url: string | null;
};

type Props = {
    stats: {
        revenue_minor: number;
        month_revenue_minor: number;
        paid_count: number;
        pending_count: number;
        success_rate: number;
        currency: string;
    };
    transactions: {
        data: Transaction[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    filters: { search: string; status: string };
};

const money = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
        amount / 100,
    );

const labels: Record<string, string> = {
    paid: 'Payé',
    pending: 'En attente',
    failed: 'Échoué',
    cancelled: 'Annulé',
};

export default function SuperAdminTransactions({
    stats,
    transactions,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    const applyFilters = () =>
        router.get(
            '/superadmin/transactions',
            { search, status },
            { preserveState: true },
        );

    return (
        <>
            <Head title="Transactions de la plateforme" />
            <header className="mb-7">
                <p className="text-xs font-bold tracking-[0.18em] text-amber-700 uppercase">
                    Revenus de la plateforme
                </p>
                <h1 className="mt-2 font-display text-4xl font-semibold">
                    Transactions
                </h1>
                <p className="mt-2 text-stone-500">
                    Suivi des encaissements RDCARD, paiements et reçus clients.
                </p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                    icon={CircleDollarSign}
                    label="Revenus encaissés"
                    value={money(stats.revenue_minor, stats.currency)}
                />
                <Metric
                    icon={ReceiptText}
                    label="Ce mois"
                    value={money(stats.month_revenue_minor, stats.currency)}
                />
                <Metric
                    icon={Gauge}
                    label="Taux de réussite"
                    value={`${stats.success_rate}%`}
                />
                <Metric
                    icon={TimerReset}
                    label="En attente"
                    value={stats.pending_count}
                />
            </section>

            <Card className="mt-6">
                <CardContent className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) =>
                                event.key === 'Enter' && applyFilters()
                            }
                            placeholder="Référence, organisation ou événement…"
                            className="md:max-w-md"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-10 rounded-md border bg-white px-3 text-sm"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="paid">Payés</option>
                            <option value="pending">En attente</option>
                            <option value="failed">Échoués</option>
                            <option value="cancelled">Annulés</option>
                        </select>
                        <Button onClick={applyFilters}>
                            <Search className="mr-2 h-4 w-4" /> Rechercher
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-5 overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[940px] text-left text-sm">
                            <thead className="border-b bg-stone-50 text-xs text-stone-400 uppercase">
                                <tr>
                                    <th className="px-5 py-4">Client</th>
                                    <th className="px-5 py-4">Référence</th>
                                    <th className="px-5 py-4">Pack</th>
                                    <th className="px-5 py-4">Montant</th>
                                    <th className="px-5 py-4">Statut</th>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4 text-right">
                                        Reçu
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {transactions.data.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="px-5 py-4">
                                            <p className="font-medium">
                                                {transaction.organization ||
                                                    '—'}
                                            </p>
                                            <p className="text-xs text-stone-400">
                                                {transaction.event}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-xs">
                                            {transaction.reference}
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
                                                {labels[transaction.status] ||
                                                    transaction.status}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-stone-500">
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
                                                        Reçu
                                                    </a>
                                                </Button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-12 text-center text-stone-400"
                                        >
                                            Aucune transaction trouvée.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {transactions.links.length > 3 && (
                        <div className="flex flex-wrap gap-2 border-t p-4">
                            {transactions.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        key={index}
                                        href={link.url}
                                        className={`rounded-lg px-3 py-2 text-xs ${link.active ? 'bg-stone-950 text-white' : 'bg-stone-100'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ) : null,
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

function Metric({ icon: Icon, label, value }: any) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-800">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
