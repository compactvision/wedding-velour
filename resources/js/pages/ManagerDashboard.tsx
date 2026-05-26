import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Users, UtensilsCrossed, Clock, CheckCircle2, AlertCircle,
  Hourglass, TrendingUp, Loader2, TableProperties, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, sub = undefined, color = 'text-primary' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("text-3xl font-bold mt-1", color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-xl bg-muted", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboard() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activeWeddingId],
    queryFn: () => base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
    refetchInterval: 15000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', activeWeddingId],
    queryFn: () => base44.entities.Order.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
    refetchInterval: 10000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', activeWeddingId],
    queryFn: () => base44.entities.WeddingTable.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['timeline', activeWeddingId],
    queryFn: () => base44.entities.TimelineEvent.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const pending_orders = orders.filter(o => o.status === 'pending').length;
  const in_progress_orders = orders.filter(o => o.status === 'in_progress').length;
  const served_orders = orders.filter(o => o.status === 'served').length;
  const seated = guests.filter(g => g.table_id).length;
  const current_event = timeline.find(e => e.status === 'in_progress');
  const next_event = timeline.filter(e => e.status === 'upcoming').sort((a, b) => a.time?.localeCompare(b.time))[0];

  // Orders by table
  const tableOrderMap = {};
  orders.filter(o => o.status === 'pending' || o.status === 'in_progress').forEach(o => {
    if (!tableOrderMap[o.table_name]) tableOrderMap[o.table_name] = [];
    tableOrderMap[o.table_name].push(o);
  });

  return (
    <div>
      <PageHeader title="Vue Manager" subtitle="Supervision en temps réel">
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={UserCheck} label="Invités arrivés" value={confirmed} sub={`sur ${guests.length} invités`} color="text-green-600" />
        <StatCard icon={TableProperties} label="Invités placés" value={seated} sub={`${tables.length} tables`} color="text-blue-600" />
        <StatCard icon={AlertCircle} label="Commandes en attente" value={pending_orders} color="text-amber-600" />
        <StatCard icon={CheckCircle2} label="Commandes servies" value={served_orders} color="text-primary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active programme */}
        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Programme</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {current_event ? (
              <div className="p-3 rounded-xl bg-primary/8 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">En cours</span>
                </div>
                <p className="font-semibold">{current_event.time} — {current_event.title}</p>
                {current_event.description && <p className="text-xs text-muted-foreground mt-0.5">{current_event.description}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun événement en cours</p>
            )}
            {next_event && (
              <div className="p-3 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-1">
                  <Hourglass className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Prochain</span>
                </div>
                <p className="text-sm font-medium">{next_event.time} — {next_event.title}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders summary */}
        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-primary" /> Commandes actives</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              {[
                { label: 'En attente', count: pending_orders, color: 'bg-amber-100 text-amber-700' },
                { label: 'En cours', count: in_progress_orders, color: 'bg-blue-100 text-blue-700' },
                { label: 'Servies', count: served_orders, color: 'bg-green-100 text-green-700' },
              ].map(({ label, count, color }) => (
                <div key={label} className={cn("flex-1 rounded-xl p-3 text-center", color)}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {Object.keys(tableOrderMap).length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Tables avec commandes en attente :</p>
                {Object.entries(tableOrderMap).map(([tableName, tableOrders]) => (
                  <div key={tableName} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-sm font-medium">{tableName}</span>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">{tableOrders.length} commande{tableOrders.length > 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">Tout est à jour ✓</p>
            )}
          </CardContent>
        </Card>

        {/* Guest arrival progress */}
        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Arrivées des invités</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-semibold">{confirmed}/{guests.length}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: guests.length ? `${(confirmed / guests.length) * 100}%` : '0%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{guests.length ? Math.round((confirmed / guests.length) * 100) : 0}% des invités sont arrivés</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {['invited', 'confirmed', 'declined', 'absent'].map(status => (
                <div key={status} className="text-center">
                  <div className="text-lg font-bold">{guests.filter(g => g.status === status).length}</div>
                  <StatusBadge status={status} className="text-xs" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Dernières commandes</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-64 overflow-y-auto">
            {orders.slice(0, 10).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted text-sm">
                <div>
                  <span className="font-medium">{o.description}</span>
                  <span className="text-muted-foreground text-xs ml-2">{o.table_name} · {o.guest_name}</span>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
            {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Aucune commande</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}