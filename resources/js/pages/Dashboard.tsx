import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UtensilsCrossed, TableProperties, Camera, Clock, Plus, Heart, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function NewWeddingDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', date: '', venue: '' });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Wedding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
      onOpenChange(false);
      setForm({ title: '', date: '', venue: '' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Nouveau Mariage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre (ex: Sophie & Thomas)</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Les mariés" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div>
            <Label>Lieu</Label>
            <Input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="Château de..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.date}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { weddings, activeWedding, activeWeddingId, setActiveWeddingId, isLoading } = useActiveWedding();
  const [showNewWedding, setShowNewWedding] = useState(false);

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activeWeddingId],
    queryFn: () => base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', activeWeddingId],
    queryFn: () => base44.entities.WeddingTable.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', activeWeddingId],
    queryFn: () => base44.entities.Order.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['timeline', activeWeddingId],
    queryFn: () => base44.entities.TimelineEvent.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const confirmedGuests = guests.filter(g => g.status === 'confirmed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalCompanions = guests.reduce((sum, g) => sum + (g.companions || 0), 0);

  if (!activeWedding && !isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <EmptyState
          icon={Heart}
          title="Bienvenue sur Wedding Velour"
          description="Créez votre premier mariage pour commencer l'organisation"
          actionLabel="Créer un mariage"
          onAction={() => setShowNewWedding(true)}
        />
        <NewWeddingDialog open={showNewWedding} onOpenChange={setShowNewWedding} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={activeWedding?.title}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <Button onClick={() => setShowNewWedding(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nouveau
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Invités" value={guests.length} subtitle={`${confirmedGuests} confirmés · ${totalCompanions} accompagnants`} icon={Users} />
        <StatCard title="Tables" value={tables.length} subtitle={`${tables.reduce((s, t) => s + (t.capacity || 0), 0)} places`} icon={TableProperties} />
        <StatCard title="Commandes" value={orders.length} subtitle={`${pendingOrders} en attente`} icon={UtensilsCrossed} />
        <StatCard title="Programme" value={timeline.length} subtitle="événements planifiés" icon={Clock} />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Wedding Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {activeWedding?.date ? format(new Date(activeWedding.date), 'dd MMMM yyyy', { locale: fr }) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Lieu</span>
              <span className="text-sm font-medium">{activeWedding?.venue || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <StatusBadge status={activeWedding?.status || 'planning'} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Capacité max</span>
              <span className="text-sm font-medium">{activeWedding?.max_guests || 100} invités</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Commandes récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.description}</p>
                      <p className="text-xs text-muted-foreground">{order.table_name || 'Table ?'}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RSVP Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Réponses RSVP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['confirmed', 'invited', 'declined', 'absent'].map(status => {
                const count = guests.filter(g => g.status === status).length;
                const pct = guests.length > 0 ? Math.round((count / guests.length) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <StatusBadge status={status} />
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Programme du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun événement planifié</p>
            ) : (
              <div className="space-y-3">
                {timeline.sort((a, b) => (a.time || '').localeCompare(b.time || '')).slice(0, 5).map(evt => (
                  <div key={evt.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm font-mono font-semibold text-primary min-w-[50px]">{evt.time}</span>
                    <div>
                      <p className="text-sm font-medium">{evt.title}</p>
                      <StatusBadge status={evt.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewWeddingDialog open={showNewWedding} onOpenChange={setShowNewWedding} />
    </div>
  );
}
