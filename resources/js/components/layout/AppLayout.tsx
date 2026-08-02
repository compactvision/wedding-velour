import { Link, usePage } from '@inertiajs/react';
import { Menu, MoreHorizontal } from 'lucide-react';
import React, { useState } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import OfflineStatus from '@/components/shared/OfflineStatus';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import Sidebar, { isNavItemVisible, navItems } from './Sidebar';

function MobileNavigation() {
    const { url, props } = usePage();
    const user = (props as any).auth?.user;
    const workspace = (props as any).workspace;
    const visibleNavItems = navItems.filter((item) =>
        isNavItemVisible(item, user, workspace),
    );
    const primaryItems = visibleNavItems.slice(0, 4);
    const secondaryItems = visibleNavItems.slice(4);
    const actionItems = [
        ...(['admin', 'server'].includes(user?.role)
            ? [{ path: '/server', label: 'Serveur' }]
            : []),
        ...(['admin', 'door'].includes(user?.role)
            ? [{ path: '/door', label: 'Porte' }]
            : []),
    ];

    const isActive = (path: string) =>
        path === '/' ? url === '/' : url.startsWith(path);

    return (
        <>
            <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 px-4 py-3 backdrop-blur-xl md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <BrandLogo variant="full" className="h-12 w-36" />
                    <div className="flex items-center gap-2">
                        <OfflineStatus />
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="w-[88vw] max-w-sm p-0"
                            >
                                <SheetHeader className="border-b px-5 py-4 text-left">
                                    <SheetTitle className="font-display text-xl">
                                        Navigation
                                    </SheetTitle>
                                </SheetHeader>
                                <nav className="grid gap-2 p-4">
                                    {[...visibleNavItems, ...actionItems].map(
                                        ({ path, label, icon: Icon }: any) => (
                                            <Link
                                                key={path}
                                                href={path}
                                                className={cn(
                                                    'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                                                    isActive(path)
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                )}
                                            >
                                                {Icon ? (
                                                    <Icon className="h-5 w-5 shrink-0" />
                                                ) : (
                                                    <MoreHorizontal className="h-5 w-5 shrink-0" />
                                                )}
                                                <span>{label}</span>
                                            </Link>
                                        ),
                                    )}
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="mt-2 flex min-h-12 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                                    >
                                        Déconnexion
                                    </Link>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/96 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_35px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden">
                <div className="grid grid-cols-5 gap-1">
                    {primaryItems.map(({ path, icon: Icon, label }) => (
                        <Link
                            key={path}
                            href={path}
                            className={cn(
                                'flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-colors',
                                isActive(path)
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="max-w-full truncate">
                                {label
                                    .replace('Tableau de bord', 'Accueil')
                                    .replace('Plan de salle', 'Salle')}
                            </span>
                        </Link>
                    ))}
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <MoreHorizontal className="h-5 w-5 shrink-0" />
                                <span>Plus</span>
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="bottom"
                            className="max-h-[82svh] rounded-t-lg pb-[max(env(safe-area-inset-bottom),1rem)]"
                        >
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display">
                                    Plus d'actions
                                </SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {[...secondaryItems, ...actionItems].map(
                                    ({ path, label, icon: Icon }: any) => (
                                        <Link
                                            key={path}
                                            href={path}
                                            className={cn(
                                                'flex min-h-14 items-center gap-3 rounded-md border px-3 text-sm font-medium',
                                                isActive(path)
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border bg-card text-foreground',
                                            )}
                                        >
                                            {Icon ? (
                                                <Icon className="h-5 w-5 shrink-0" />
                                            ) : (
                                                <MoreHorizontal className="h-5 w-5 shrink-0" />
                                            )}
                                            <span className="min-w-0 truncate">
                                                {label}
                                            </span>
                                        </Link>
                                    ),
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const { props } = usePage();
    const success = (props as any).flash?.success;

    return (
        <div className="min-h-screen overflow-x-hidden bg-background font-sans">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
            />
            <MobileNavigation />
            <main
                className={cn(
                    'min-h-screen transition-all duration-300',
                    collapsed ? 'md:ml-16' : 'md:ml-64',
                )}
            >
                <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-28 sm:px-5 md:p-6 lg:p-8">
                    <div className="mb-4 hidden justify-end md:flex">
                        <OfflineStatus />
                    </div>
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
