import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Info, AlertTriangle, UtensilsCrossed, Clock, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeConfig = {
  info: { icon: Info, color: 'text-blue-500 bg-blue-50' },
  alert: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
  order: { icon: UtensilsCrossed, color: 'text-green-500 bg-green-50' },
  timeline: { icon: Clock, color: 'text-purple-500 bg-purple-50' },
  photo: { icon: Camera, color: 'text-pink-500 bg-pink-50' },
};

export default function Notifications() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', activeWeddingId],
    queryFn: () => base44.entities.WeddingNotification.filter({ wedding_id: activeWeddingId }, '-created_date'),
    enabled: !!activeWeddingId,
  });

  useEffect(() => {
    if (!activeWeddingId) return;
    const unsub = base44.entities.WeddingNotification.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications', activeWeddingId] });
    });
    return unsub;
  }, [activeWeddingId, queryClient]);

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.WeddingNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', activeWeddingId] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unreadCount} non lues`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Les notifications apparaîtront ici" />
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifications.map(notif => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <Card key={notif.id} className={cn("p-4 flex items-start gap-3 transition-all cursor-pointer hover:shadow-sm", !notif.is_read && "bg-primary/5 border-primary/20")} onClick={() => !notif.is_read && markRead.mutate(notif.id)}>
                <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-medium", !notif.is_read && "font-semibold")}>{notif.title}</p>
                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}