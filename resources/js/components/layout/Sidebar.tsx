import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Users,
    UtensilsCrossed,
    Clock,
    Camera,
    Bell,
    TableProperties,
    ChevronLeft,
    ChevronRight,
    LogOut,
    MenuSquare,
    ShieldCheck,
    TrendingUp,
    UserCog,
    MailOpen,
    Building2,
    CalendarRange,
    WalletCards,
    PackageSearch,
    Handshake,
    FolderLock,
    Tickets,
    IdCard,
} from 'lucide-react';
import React from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { cn } from '@/lib/utils';

type NavItem = {
    path: string;
    icon: React.ElementType;
    label: string;
    roles: string[];
    modules?: string[];
    permission?: string;
};

type NavigationWorkspace = {
    modules?: string[];
    permissions?: string[];
} | null;

export const navItems: NavItem[] = [
    {
        path: '/workspace',
        icon: CalendarRange,
        label: 'Aperçu événement',
        roles: ['admin', 'manager'],
    },
    {
        path: '/dashboard',
        icon: LayoutDashboard,
        label: 'Tableau de bord',
        roles: ['admin', 'manager'],
        permission: 'event.view',
    },
    {
        path: '/onboarding',
        icon: Building2,
        label: 'Espaces & événements',
        roles: ['admin', 'manager'],
    },
    {
        path: '/guests',
        icon: Users,
        label: 'Invités',
        roles: ['admin', 'manager'],
        modules: ['guests'],
        permission: 'guests.view',
    },
    {
        path: '/tables',
        icon: TableProperties,
        label: 'Plan de salle',
        roles: ['admin', 'manager'],
        modules: ['seating'],
        permission: 'seating.view',
    },
    {
        path: '/menu-admin',
        icon: MenuSquare,
        label: 'Menu',
        roles: ['admin', 'manager'],
        modules: ['catering'],
        permission: 'catering.view',
    },
    {
        path: '/orders',
        icon: UtensilsCrossed,
        label: 'Commandes',
        roles: ['admin', 'manager'],
        modules: ['catering'],
        permission: 'catering.view',
    },
    {
        path: '/timeline',
        icon: Clock,
        label: 'Programme',
        roles: ['admin', 'manager'],
        modules: ['schedule'],
        permission: 'schedule.view',
    },
    {
        path: '/custom-invitation',
        icon: MailOpen,
        label: 'Custom invitation',
        roles: ['admin', 'manager'],
        modules: ['invitations'],
        permission: 'invitations.view',
    },
    {
        path: '/photos',
        icon: Camera,
        label: 'Galerie',
        roles: ['admin', 'manager'],
        modules: ['media', 'gallery'],
        permission: 'media.view',
    },
    {
        path: '/notifications',
        icon: Bell,
        label: 'Notifications',
        roles: ['admin', 'manager'],
        modules: ['notifications'],
        permission: 'notifications.view',
    },
    {
        path: '/manager',
        icon: TrendingUp,
        label: 'Vue Manager',
        roles: ['admin', 'manager'],
        modules: ['analytics'],
        permission: 'event.update',
    },
    {
        path: '/agents',
        icon: UserCog,
        label: 'Équipe & accès',
        roles: ['admin', 'manager'],
        modules: ['staff'],
        permission: 'team.view',
    },
    {
        path: '/budget',
        icon: WalletCards,
        label: 'Budget & dépenses',
        roles: ['admin', 'manager'],
        modules: ['budget'],
        permission: 'budget.view',
    },
    {
        path: '/inventory',
        icon: PackageSearch,
        label: 'Stock & achats',
        roles: ['admin', 'manager'],
        modules: ['stock', 'purchasing'],
        permission: 'stock.view',
    },
    {
        path: '/vendors',
        icon: Handshake,
        label: 'Prestataires & contrats',
        roles: ['admin', 'manager'],
        modules: ['vendors', 'contracts'],
        permission: 'vendors.view',
    },
    {
        path: '/documents',
        icon: FolderLock,
        label: 'Documents',
        roles: ['admin', 'manager'],
        modules: ['documents'],
        permission: 'documents.view',
    },
    {
        path: '/ticketing',
        icon: Tickets,
        label: 'Billetterie',
        roles: ['admin', 'manager'],
        modules: ['ticketing'],
        permission: 'ticketing.view',
    },
    {
        path: '/badges',
        icon: IdCard,
        label: 'Badges',
        roles: ['admin', 'manager'],
        modules: ['badges'],
        permission: 'badges.view',
    },
];

export function isNavItemVisible(
    item: NavItem,
    user: { role?: string } | null | undefined,
    workspace: NavigationWorkspace,
) {
    if (!item.roles.includes(user?.role)) {
        return false;
    }

    const permissions = workspace?.permissions || [];
    const hasPermission =
        !item.permission ||
        permissions.includes('*') ||
        permissions.includes(item.permission);
    const enabledModules = workspace?.modules || [];
    const hasModule =
        !item.modules ||
        item.modules.some((module) => enabledModules.includes(module));

    return hasPermission && hasModule;
}

export default function Sidebar({ collapsed, onToggle }) {
    const { url, props } = usePage();
    const user = (props as any).auth?.user;
    const workspace = (props as any).workspace;
    const visibleNavItems = navItems.filter((item) =>
        isNavItemVisible(item, user, workspace),
    );

    return (
        <aside
            className={cn(
                'fixed top-0 left-0 z-40 hidden h-full flex-col border-r border-border bg-card/95 shadow-sm backdrop-blur-xl transition-all duration-300 md:flex',
                collapsed ? 'w-16' : 'w-64',
            )}
        >
            {/* Logo */}
            <div className="flex h-20 items-center justify-center overflow-hidden border-b border-border px-2">
                <BrandLogo
                    variant={collapsed ? 'mark' : 'full'}
                    className={collapsed ? 'h-12 w-12' : 'h-20 w-52'}
                />
            </div>

            {/* Navigation */}
            {!collapsed && (
                <Link
                    href="/onboarding"
                    className="mx-3 mt-3 block rounded-xl border border-border bg-muted/60 px-3 py-3 transition-colors hover:bg-muted"
                >
                    <div className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                        Espace actif
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">
                        {workspace?.event?.name || 'Choisir un événement'}
                    </div>
                    {workspace?.organization?.name && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {workspace.organization.name}
                        </div>
                    )}
                </Link>
            )}
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
                {visibleNavItems.map(({ path, icon: Icon, label }) => {
                    const isActive =
                        path === '/' ? url === '/' : url.startsWith(path);

                    return (
                        <Link
                            key={path}
                            href={path}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!collapsed && <span>{label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="space-y-1 border-t border-border p-2">
                {['admin', 'server'].includes(user?.role) && (
                    <Link
                        href="/server"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                        <UtensilsCrossed className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Mode Serveur</span>}
                    </Link>
                )}
                {['admin', 'door'].includes(user?.role) && (
                    <Link
                        href="/door"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>Agent à la porte</span>}
                    </Link>
                )}
                {!collapsed && user && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                        <div className="truncate font-medium text-foreground">
                            {user.name}
                        </div>
                        <div className="capitalize">{user.role}</div>
                    </div>
                )}
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Déconnexion</span>}
                </Link>
                <button
                    onClick={onToggle}
                    className="flex w-full items-center justify-center py-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </button>
            </div>
        </aside>
    );
}
