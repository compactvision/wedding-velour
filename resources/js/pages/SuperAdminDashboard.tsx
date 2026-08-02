import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    CreditCard,
    DollarSign,
    PackageCheck,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
    stats: {
        users: number;
        active_users: number;
        organizations: number;
        events: number;
        active_subscriptions: number;
        revenue_minor: number;
    };
    plans: Array<{
        id: string;
        slug: string;
        name: string;
        currency: string;
        base_price_minor: number;
        subscriptions_count: number;
        active_subscriptions_count: number;
    }>;
    payments: Array<{
        id: string;
        organization: string | null;
        event: string | null;
        plan: string | null;
        amount_minor: number;
        currency: string;
        status: string;
        provider: string;
        reference: string;
        created_at: string;
    }>;
    subscriptions: Array<{
        id: string;
        organization: string | null;
        event: string | null;
        plan: string | null;
        status: string;
        starts_at: string | null;
        ends_at: string | null;
    }>;
    users: Array<{
        id: number;
        name: string;
        email: string;
        role: string;
        status: string;
        is_active: boolean;
        created_at: string;
    }>;
};

const money = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
        amount / 100,
    );

const date = (value: string | null) =>
    value
        ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
              new Date(value),
          )
        : '—';

export default function SuperAdminDashboard({
    stats,
    plans,
    payments,
    subscriptions,
    users,
}: Props) {
    const [search, setSearch] = useState('');
    const [processingUser, setProcessingUser] = useState<number | null>(null);
    const visibleUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return users;
        }

        return users.filter((user) =>
            `${user.name} ${user.email} ${user.role}`
                .toLowerCase()
                .includes(query),
        );
    }, [search, users]);

    const updateUser = (
        user: Props['users'][number],
        changes: Partial<Pick<Props['users'][number], 'role' | 'is_active'>>,
    ) => {
        setProcessingUser(user.id);
        router.patch(
            `/superadmin/users/${user.id}`,
            {
                role: changes.role ?? user.role,
                is_active: changes.is_active ?? user.is_active,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessingUser(null),
            },
        );
    };

    return (
        <>
            <Head title="Administration de la plateforme" />
            <header className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-amber-700 uppercase">
                        Console superadmin
                    </p>
                    <h1 className="mt-2 font-display text-4xl font-semibold">
                        Pilotage de la plateforme
                    </h1>
                    <p className="mt-2 text-stone-500">
                        Utilisateurs, revenus, abonnements et offres Planivo.
                    </p>
                </div>
                <Button
                    asChild
                    className="bg-stone-950 text-white hover:bg-stone-800"
                >
                    <Link href="/settings/pricing">
                        <Settings2 className="mr-2 h-4 w-4" /> Gérer les plans
                        et prix
                    </Link>
                </Button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat
                    icon={Users}
                    label="Utilisateurs"
                    value={stats.users}
                    detail={`${stats.active_users} actifs`}
                />
                <Stat
                    icon={Building2}
                    label="Organisations"
                    value={stats.organizations}
                />
                <Stat
                    icon={CalendarDays}
                    label="Événements"
                    value={stats.events}
                />
                <Stat
                    icon={PackageCheck}
                    label="Packs actifs"
                    value={stats.active_subscriptions}
                />
                <Stat
                    icon={DollarSign}
                    label="Revenus encaissés"
                    value={money(stats.revenue_minor)}
                />
            </section>

            <section className="mt-8 grid gap-5 xl:grid-cols-3">
                {plans.map((plan) => (
                    <Card key={plan.id} className="border-stone-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{plan.name}</span>
                                <CreditCard className="h-5 w-5 text-amber-700" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-display text-3xl font-semibold">
                                {money(plan.base_price_minor, plan.currency)}
                            </p>
                            <div className="mt-5 flex gap-5 text-sm text-stone-500">
                                <span>
                                    {plan.active_subscriptions_count} actifs
                                </span>
                                <span>{plan.subscriptions_count} achetés</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="mt-8 grid gap-6 2xl:grid-cols-2">
                <DataPanel title="Transactions récentes" icon={CreditCard}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="text-xs text-stone-400 uppercase">
                                <tr>
                                    <th className="pb-3">Client</th>
                                    <th className="pb-3">Offre</th>
                                    <th className="pb-3">Montant</th>
                                    <th className="pb-3">Statut</th>
                                    <th className="pb-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="py-3">
                                            <p className="font-medium">
                                                {payment.organization || '—'}
                                            </p>
                                            <p className="text-xs text-stone-400">
                                                {payment.event}
                                            </p>
                                        </td>
                                        <td className="py-3">
                                            {payment.plan || '—'}
                                        </td>
                                        <td className="py-3 font-semibold">
                                            {money(
                                                payment.amount_minor,
                                                payment.currency,
                                            )}
                                        </td>
                                        <td className="py-3">
                                            <Status value={payment.status} />
                                        </td>
                                        <td className="py-3 text-stone-500">
                                            {date(payment.created_at)}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-stone-400"
                                        >
                                            Aucune transaction
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </DataPanel>

                <DataPanel title="Packs et abonnements" icon={PackageCheck}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="text-xs text-stone-400 uppercase">
                                <tr>
                                    <th className="pb-3">Organisation</th>
                                    <th className="pb-3">Pack</th>
                                    <th className="pb-3">Statut</th>
                                    <th className="pb-3">Expiration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {subscriptions.map((subscription) => (
                                    <tr key={subscription.id}>
                                        <td className="py-3">
                                            <p className="font-medium">
                                                {subscription.organization ||
                                                    '—'}
                                            </p>
                                            <p className="text-xs text-stone-400">
                                                {subscription.event}
                                            </p>
                                        </td>
                                        <td className="py-3">
                                            {subscription.plan || '—'}
                                        </td>
                                        <td className="py-3">
                                            <Status
                                                value={subscription.status}
                                            />
                                        </td>
                                        <td className="py-3 text-stone-500">
                                            {date(subscription.ends_at)}
                                        </td>
                                    </tr>
                                ))}
                                {subscriptions.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-8 text-center text-stone-400"
                                        >
                                            Aucun pack acheté
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </DataPanel>
            </section>

            <section className="mt-8">
                <DataPanel title="Gestion des utilisateurs" icon={ShieldCheck}>
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Rechercher par nom, email ou rôle…"
                        className="mb-5 max-w-md"
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-left text-sm">
                            <thead className="text-xs text-stone-400 uppercase">
                                <tr>
                                    <th className="pb-3">Utilisateur</th>
                                    <th className="pb-3">Rôle</th>
                                    <th className="pb-3">État</th>
                                    <th className="pb-3">Inscription</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {visibleUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="py-3">
                                            <p className="font-medium">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-stone-400">
                                                {user.email}
                                            </p>
                                        </td>
                                        <td className="py-3">
                                            <select
                                                value={user.role}
                                                disabled={
                                                    processingUser === user.id
                                                }
                                                onChange={(event) =>
                                                    updateUser(user, {
                                                        role: event.target
                                                            .value,
                                                    })
                                                }
                                                className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm"
                                            >
                                                <option value="manager">
                                                    Organisateur
                                                </option>
                                                <option value="admin">
                                                    Administrateur
                                                </option>
                                                <option value="server">
                                                    Serveur
                                                </option>
                                                <option value="door">
                                                    Contrôleur d’accès
                                                </option>
                                            </select>
                                        </td>
                                        <td className="py-3">
                                            <Status
                                                value={
                                                    user.is_active
                                                        ? 'active'
                                                        : 'suspended'
                                                }
                                            />
                                        </td>
                                        <td className="py-3 text-stone-500">
                                            {date(user.created_at)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant={
                                                    user.is_active
                                                        ? 'outline'
                                                        : 'default'
                                                }
                                                disabled={
                                                    processingUser === user.id
                                                }
                                                onClick={() =>
                                                    updateUser(user, {
                                                        is_active:
                                                            !user.is_active,
                                                    })
                                                }
                                            >
                                                {user.is_active
                                                    ? 'Suspendre'
                                                    : 'Réactiver'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DataPanel>
            </section>
        </>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    detail,
}: {
    icon: typeof Users;
    label: string;
    value: string | number;
    detail?: string;
}) {
    return (
        <Card className="border-stone-200 shadow-sm">
            <CardContent className="p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm text-stone-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
                {detail && (
                    <p className="mt-1 text-xs text-stone-400">{detail}</p>
                )}
            </CardContent>
        </Card>
    );
}

function DataPanel({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: typeof Users;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-stone-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-amber-700" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Status({ value }: { value: string }) {
    const positive = ['active', 'paid', 'succeeded'].includes(value);

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                positive
                    ? 'bg-emerald-100 text-emerald-700'
                    : value === 'suspended' || value === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700',
            )}
        >
            {value}
        </span>
    );
}
