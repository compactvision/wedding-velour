import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UtensilsCrossed, ArrowRight, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Heart, ArrowLeft, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from '@inertiajs/react';

const typeEmojis = { drink: '🍷', food: '🍽️', dessert: '🍰', special_request: '✨' };
const priorityBorders = { low: 'border-l-gray-300', normal: 'border-l-blue-400', high: 'border-l-amber-400', urgent: 'border-l-red-500' };

export default function ServerInterface() {
  const { activeWedding, activeWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', activeWeddingId],
    queryFn: () => base44.entities.Order.filter({ wedding_id: activeWeddingId }, '-created_date'),
    enabled: !!activeWeddingId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!activeWeddingId) return;
    const unsub = base44.entities.Order.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['orders', activeWeddingId] });
    });
    return unsub;
  }, [activeWeddingId, queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', activeWeddingId] }),
  });

  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" fill="currentColor" />
                <span className="font-display font-semibold">Mode Serveur</span>
              </div>
              <p className="text-xs text-muted-foreground">{activeWedding?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <Bell className="w-3 h-3 mr-1" />
                {pendingCount} en attente
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{orders.filter(o => o.status === 'served').length}</p>
            <p className="text-xs text-muted-foreground">Servi</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-1">
              <Clock className="w-3.5 h-3.5" /> Attente
              {pendingCount > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-1">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1">En cours</TabsTrigger>
            <TabsTrigger value="served" className="flex-1">Servi</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">Tout</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <Card key={order.id} className={cn("p-4 border-l-4 transition-all", priorityBorders[order.priority] || priorityBorders.normal)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeEmojis[order.type] || '📋'}</span>
                    <div>
                      <p className="font-semibold">{order.description}</p>
                      <p className="text-sm text-muted-foreground">{order.table_name} · {order.guest_name || 'Invité'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={order.status} />
                        {order.priority === 'urgent' && <Badge variant="destructive" className="text-xs">URGENT</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_date), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {order.notes && <p className="text-sm text-muted-foreground mt-2 pl-11 italic">{order.notes}</p>}
                <div className="flex gap-2 mt-3 pl-11">
                  {order.status === 'pending' && (
                    <Button className="flex-1 h-12 text-base" onClick={() => updateMutation.mutate({ id: order.id, status: 'in_progress' })}>
                      <ArrowRight className="w-5 h-5 mr-2" /> Prendre en charge
                    </Button>
                  )}
                  {order.status === 'in_progress' && (
                    <Button className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: order.id, status: 'served' })}>
                      <CheckCircle2 className="w-5 h-5 mr-2" /> Marquer servi
                    </Button>
                  )}
                  {(order.status === 'pending' || order.status === 'in_progress') && (
                    <Button variant="outline" className="h-12" onClick={() => updateMutation.mutate({ id: order.id, status: 'cancelled' })}>
                      <XCircle className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}