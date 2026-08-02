import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    is_active: boolean;
    email_verified_at: string | null;
    created_at: string;
    organizations_count: number;
    is_protected: boolean;
};

type PaginatedUsers = {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    users: PaginatedUsers;
    filters: { search: string; role: string; status: string };
};

const roles: Record<string, string> = {
    superadmin: 'Superadministrateur',
    admin: 'Administrateur',
    manager: 'Organisateur',
    server: 'Serveur',
    door: 'Contrôleur d’accès',
};

const formatDate = (value: string) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
        new Date(value),
    );

export default function SuperAdminUsers({ users, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role);
    const [status, setStatus] = useState(filters.status);
    const [processingUser, setProcessingUser] = useState<number | null>(null);

    const filter = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/superadmin/users',
            { search, role, status },
            { preserveState: true, replace: true },
        );
    };

    const updateUser = (
        user: User,
        changes: Partial<Pick<User, 'role' | 'is_active'>>,
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
            <Head title="Utilisateurs de la plateforme" />
            <header className="mb-8">
                <p className="text-xs font-bold tracking-[0.18em] text-amber-700 uppercase">
                    Console superadmin
                </p>
                <h1 className="mt-2 font-display text-4xl font-semibold">
                    Utilisateurs
                </h1>
                <p className="mt-2 text-stone-500">
                    Consultez tous les comptes et adaptez leurs accès à la
                    plateforme.
                </p>
            </header>

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <Summary
                    icon={Users}
                    label="Comptes trouvés"
                    value={users.total}
                />
                <Summary
                    icon={UserCheck}
                    label="Affichés sur cette page"
                    value={users.data.length}
                />
                <Summary
                    icon={ShieldCheck}
                    label="Rôles disponibles"
                    value={4}
                />
            </section>

            <Card className="border-stone-200 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                    <form
                        onSubmit={filter}
                        className="mb-6 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px_auto]"
                    >
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Nom ou adresse email…"
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                            className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
                        >
                            <option value="">Tous les rôles</option>
                            {Object.entries(roles).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
                        >
                            <option value="">Tous les états</option>
                            <option value="active">Actifs</option>
                            <option value="suspended">Suspendus</option>
                        </select>
                        <Button type="submit">Filtrer</Button>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="border-b border-stone-200 text-xs text-stone-400 uppercase">
                                <tr>
                                    <th className="pb-3">Utilisateur</th>
                                    <th className="pb-3">Rôle</th>
                                    <th className="pb-3">État</th>
                                    <th className="pb-3">Organisations</th>
                                    <th className="pb-3">Inscription</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {users.data.map((user) => (
                                    <tr key={user.id}>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-100 font-semibold text-stone-600">
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-stone-900">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-stone-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            {user.is_protected ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    Superadministrateur
                                                </span>
                                            ) : (
                                                <select
                                                    value={user.role}
                                                    disabled={
                                                        processingUser ===
                                                        user.id
                                                    }
                                                    onChange={(event) =>
                                                        updateUser(user, {
                                                            role: event.target
                                                                .value,
                                                        })
                                                    }
                                                    className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm"
                                                >
                                                    {Object.entries(roles)
                                                        .filter(
                                                            ([value]) =>
                                                                value !==
                                                                'superadmin',
                                                        )
                                                        .map(
                                                            ([
                                                                value,
                                                                label,
                                                            ]) => (
                                                                <option
                                                                    key={value}
                                                                    value={
                                                                        value
                                                                    }
                                                                >
                                                                    {label}
                                                                </option>
                                                            ),
                                                        )}
                                                </select>
                                            )}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <Status active={user.is_active} />
                                        </td>
                                        <td className="py-4 pr-4 text-stone-600">
                                            {user.organizations_count}
                                        </td>
                                        <td className="py-4 pr-4 text-stone-500">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="py-4 text-right">
                                            {!user.is_protected && (
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        user.is_active
                                                            ? 'outline'
                                                            : 'default'
                                                    }
                                                    disabled={
                                                        processingUser ===
                                                        user.id
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
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-14 text-center text-stone-400"
                                        >
                                            Aucun utilisateur ne correspond à
                                            ces filtres.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-stone-100 pt-5 sm:flex-row">
                        <p className="text-sm text-stone-500">
                            {users.from ?? 0}–{users.to ?? 0} sur {users.total}{' '}
                            utilisateurs
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                asChild={Boolean(users.prev_page_url)}
                                disabled={!users.prev_page_url}
                            >
                                {users.prev_page_url ? (
                                    <Link
                                        href={users.prev_page_url}
                                        preserveScroll
                                    >
                                        <ChevronLeft className="mr-1 h-4 w-4" />{' '}
                                        Précédent
                                    </Link>
                                ) : (
                                    <span>
                                        <ChevronLeft className="mr-1 h-4 w-4" />{' '}
                                        Précédent
                                    </span>
                                )}
                            </Button>
                            <span className="px-3 py-1.5 text-sm text-stone-500">
                                Page {users.current_page} sur {users.last_page}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild={Boolean(users.next_page_url)}
                                disabled={!users.next_page_url}
                            >
                                {users.next_page_url ? (
                                    <Link
                                        href={users.next_page_url}
                                        preserveScroll
                                    >
                                        Suivant{' '}
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </Link>
                                ) : (
                                    <span>
                                        Suivant{' '}
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </footer>
                </CardContent>
            </Card>
        </>
    );
}

function Summary({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Users;
    label: string;
    value: number;
}) {
    return (
        <Card className="border-stone-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <Icon className="h-5 w-5" />
                </span>
                <div>
                    <p className="text-sm text-stone-500">{label}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function Status({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700',
            )}
        >
            {active ? 'Actif' : 'Suspendu'}
        </span>
    );
}
