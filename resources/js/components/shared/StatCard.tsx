import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle = undefined, icon: Icon = undefined, trend = undefined, className = '' }) {
  return (
    <Card className={cn("p-5 border border-border/60 bg-card hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
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