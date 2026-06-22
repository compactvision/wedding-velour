import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle = undefined, icon: Icon = undefined, trend = undefined, className = '' }) {
  return (
    <Card className={cn("border border-border/60 bg-card p-4 transition-shadow hover:shadow-md sm:p-5", className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subtitle && <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2 sm:p-2.5">
            <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      {trend && (
        <p className={cn("mt-3 text-xs font-medium", trend > 0 ? "text-green-600" : "text-accent")}>
          {trend > 0 ? '+' : ''}{trend}% depuis hier
        </p>
      )}
    </Card>
  );
}
