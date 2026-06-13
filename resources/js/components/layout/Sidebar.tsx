import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard, Users, UtensilsCrossed, Clock, Camera,
  Bell, TableProperties, ChevronLeft, ChevronRight, LogOut,
  MenuSquare, ShieldCheck, TrendingUp, UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/shared/BrandLogo';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['admin', 'manager'] },
  { path: '/guests', icon: Users, label: 'Invités', roles: ['admin', 'manager'] },
  { path: '/tables', icon: TableProperties, label: 'Plan de salle', roles: ['admin', 'manager'] },
  { path: '/menu-admin', icon: MenuSquare, label: 'Menu', roles: ['admin', 'manager'] },
  { path: '/orders', icon: UtensilsCrossed, label: 'Commandes', roles: ['admin', 'manager'] },
  { path: '/timeline', icon: Clock, label: 'Programme', roles: ['admin', 'manager'] },
  { path: '/photos', icon: Camera, label: 'Galerie', roles: ['admin', 'manager'] },
  { path: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'manager'] },
  { path: '/manager', icon: TrendingUp, label: 'Vue Manager', roles: ['admin', 'manager'] },
  { path: '/agents', icon: UserCog, label: 'Équipe & accès', roles: ['admin'] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { url, props } = usePage();
  const user = (props as any).auth?.user;
  const visibleNavItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-20 items-center justify-center overflow-hidden border-b border-border px-2">
        <BrandLogo
          variant={collapsed ? 'mark' : 'full'}
          className={collapsed ? 'h-12 w-12' : 'h-20 w-52'}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? url === '/' : url.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        {['admin', 'server'].includes(user?.role) && (
          <Link href="/server" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
            <UtensilsCrossed className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Mode Serveur</span>}
          </Link>
        )}
        {['admin', 'door'].includes(user?.role) && (
          <Link href="/door" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Agent à la porte</span>}
          </Link>
        )}
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{user.name}</div>
            <div className="capitalize">{user.role}</div>
          </div>
        )}
        <Link
          href="/logout"
          method="post"
          as="button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </Link>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
