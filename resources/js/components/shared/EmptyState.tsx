import React from 'react';
import { Button } from '@/components/ui/button';

export default function EmptyState({ icon: Icon, title, description, actionLabel = undefined, onAction = undefined }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="p-4 rounded-2xl bg-muted mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}