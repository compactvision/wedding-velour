import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard, Users, UtensilsCrossed, Clock, Camera,
  Bell, TableProperties, Heart, ChevronLeft, ChevronRight, LogOut,
  MenuSquare, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/guests', icon: Users, label: 'Invités' },
  { path: '/tables', icon: TableProperties, label: 'Plan de salle' },
  { path: '/menu-admin', icon: MenuSquare, label: 'Menu' },
  { path: '/orders', icon: UtensilsCrossed, label: 'Commandes' },
  { path: '/timeline', icon: Clock, label: 'Programme' },
  { path: '/photos', icon: Camera, label: 'Galerie' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/manager', icon: TrendingUp, label: 'Vue Manager' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { url } = usePage();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <Heart className="w-6 h-6 text-primary shrink-0" fill="currentColor" />
        {!collapsed && (
          <span className="ml-3 font-display text-lg font-semibold text-foreground tracking-tight">
            WedPlanner
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
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
        <Link href="/server" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
          <UtensilsCrossed className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Mode Serveur</span>}
        </Link>
        <Link href="/door" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Agent à la porte</span>}
        </Link>
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