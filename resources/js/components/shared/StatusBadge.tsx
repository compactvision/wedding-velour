import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  invited: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  absent: 'bg-gray-50 text-gray-600 border-gray-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  served: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  planning: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-green-50 text-green-700 border-green-200',
};

const statusLabels = {
  invited: 'Invité',
  confirmed: 'Confirmé',
  declined: 'Décliné',
  absent: 'Absent',
  pending: 'En attente',
  in_progress: 'En cours',
  served: 'Servi',
  cancelled: 'Annulé',
  upcoming: 'À venir',
  completed: 'Terminé',
  planning: 'Planification',
  active: 'Actif',
};

export default function StatusBadge({ status, className = '' }) {
  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-medium border", statusStyles[status] || 'bg-muted text-muted-foreground', className)}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}