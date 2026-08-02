import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    LogOut,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { cn } from '@/lib/utils';

const items = [
    { href: '/superadmin', label: 'Vue plateforme', icon: LayoutDashboard },
    { href: '/superadmin/users', label: 'Utilisateurs', icon: Users },
    {
        href: '/settings/pricing',
        label: 'Plans & tarification',
        icon: Settings2,
    },
];

export default function SuperAdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { url, props } = usePage();
    const user = (props as any).auth?.user;
    const success = (props as any).flash?.success;

    return (
        <div className="min-h-screen bg-stone-100 text-stone-950">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-stone-950 text-white lg:flex">
                <div className="border-b border-white/10 px-6 py-5">
                    <BrandLogo
                        variant="full"
                        className="h-16 w-40 rounded-xl bg-white px-2"
                    />
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-3">
                        <ShieldCheck className="h-5 w-5 text-amber-300" />
                        <div>
                            <p className="text-xs font-semibold tracking-wider text-amber-200 uppercase">
                                Administration
                            </p>
                            <p className="text-sm text-white/60">
                                Contrôle global
                            </p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 space-y-2 p-4">
                    {items.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                                url.startsWith(href) &&
                                    !(href === '/superadmin' && url !== href)
                                    ? 'bg-amber-400 text-stone-950'
                                    : 'text-white/60 hover:bg-white/8 hover:text-white',
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <div className="mb-3 px-3 text-sm">
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-xs text-white/40">
                            Superadministrateur
                        </p>
                    </div>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/8 hover:text-white"
                    >
                        <LogOut className="h-5 w-5" /> Déconnexion
                    </Link>
                </div>
            </aside>

            <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
                <div className="flex items-center justify-between">
                    <BrandLogo variant="full" className="h-12 w-32" />
                    <span className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />{' '}
                        Superadmin
                    </span>
                </div>
                <nav className="mt-3 flex gap-2 overflow-x-auto">
                    {items.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="shrink-0 rounded-full bg-stone-100 px-4 py-2 text-xs font-medium"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </header>

            <main className="lg:ml-72">
                <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-9">
                    {success && (
                        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {success}
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
