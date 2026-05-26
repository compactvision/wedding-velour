import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, Clock, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeIcons = {
  drink: '🍷',
  food: '🍽️',
  dessert: '🍰',
  special_request: '✨',
};

const priorityColors = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  high: 'border-l-amber-400',
  urgent: 'border-l-red-500',
};

function OrderCard({ order, onStatusChange }) {
  return (
    <Card className={cn("p-4 border-l-4 transition-all hover:shadow-md", priorityColors[order.priority] || priorityColors.normal)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[order.type] || '📋'}</span>
          <div>
            <p className="font-medium text-sm">{order.description}</p>
            <p className="text-xs text-muted-foreground">{order.table_name || 'Table ?'} · {order.guest_name || 'Invité'}</p>
          </div>
        </div>
        {order.priority === 'urgent' && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(order.created_date), { addSuffix: true, locale: fr })}
          </span>
        </div>
        <div className="flex gap-1">
          {order.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(order, 'in_progress')}>
              <ArrowRight className="w-3 h-3 mr-1" /> Prendre
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onStatusChange(order, 'served')}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Servi
            </Button>
          )}
          {(order.status === 'pending' || order.status === 'in_progress') && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onStatusChange(order, 'cancelled')}>
              <XCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      {order.notes && <p className="text-xs text-muted-foreground mt-2 italic">{order.notes}</p>}
    </Card>
  );
}

export default function Orders() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', activeWeddingId],
    queryFn: () => base44.entities.Order.filter({ wedding_id: activeWeddingId }, '-created_date'),
    enabled: !!activeWeddingId,
    refetchInterval: 5000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!activeWeddingId) return;
    const unsub = base44.entities.Order.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['orders', activeWeddingId] });
    });
    return unsub;
  }, [activeWeddingId, queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', activeWeddingId] }),
  });

  const filtered = orders.filter(o => {
    if (tab === 'all') return true;
    return o.status === tab;
  });

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    served: orders.filter(o => o.status === 'served').length,
  };

  return (
    <div>
      <PageHeader title="Commandes" subtitle={`${counts.pending} en attente · ${counts.in_progress} en cours`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> En attente
            {counts.pending > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-xs">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-1.5">
            En cours
            {counts.in_progress > 0 && <Badge className="h-5 px-1.5 text-xs bg-blue-500">{counts.in_progress}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="served">Servi</TabsTrigger>
          <TabsTrigger value="all">Tout</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Aucune commande" description="Les commandes des invités apparaîtront ici en temps réel" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={(o, status) => updateMutation.mutate({ id: o.id, status })} />
          ))}
        </div>
      )}
    </div>
  );
}