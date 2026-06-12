import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getQueuedOperations, OfflineOperation } from '@/lib/offline';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import OfflineStatus from '@/components/shared/OfflineStatus';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCheck,
  Clock,
  CloudOff,
  Info,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const typeConfig = {
  info: { icon: Info, color: 'text-blue-600 bg-blue-50' },
  alert: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  order: { icon: UtensilsCrossed, color: 'text-green-600 bg-green-50' },
  timeline: { icon: Clock, color: 'text-purple-600 bg-purple-50' },
  photo: { icon: Camera, color: 'text-pink-600 bg-pink-50' },
};

export default function Notifications() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const { online, pendingCount, syncing, lastSyncedAt, sync } = useOfflineSync();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [queuedOperations, setQueuedOperations] = useState<OfflineOperation[]>([]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', activeWeddingId],
    queryFn: () => base44.entities.WeddingNotification.filter(
      { wedding_id: activeWeddingId },
      '-created_date',
    ),
    enabled: !!activeWeddingId,
    refetchInterval: online ? 5000 : false,
  });

  useEffect(() => {
    const refreshQueue = async () => setQueuedOperations(await getQueuedOperations());
    const refreshNotifications = () => {
      void refreshQueue();
      if (navigator.onLine) {
        void queryClient.invalidateQueries({ queryKey: ['notifications', activeWeddingId] });
      }
    };

    void refreshQueue();
    window.addEventListener('offline-queue-changed', refreshQueue);
    window.addEventListener('offline-sync-complete', refreshNotifications);
    return () => {
      window.removeEventListener('offline-queue-changed', refreshQueue);
      window.removeEventListener('offline-sync-complete', refreshNotifications);
    };
  }, [activeWeddingId, queryClient]);

  const markRead = useMutation({
    mutationFn: (id: string) => base44.entities.WeddingNotification.update(id, { is_read: true }),
    onSuccess: (_updated, id) => {
      queryClient.setQueryData(['notifications', activeWeddingId], (current: any[] = []) =>
        current.map(notification => notification.id === id
          ? { ...notification, is_read: true }
          : notification),
      );
    },
  });

  const unread = notifications.filter(notification => !notification.is_read);
  const visibleNotifications = useMemo(() => {
    if (tab === 'unread') return unread;
    if (tab === 'sync') return [];
    return notifications;
  }, [notifications, tab, unread]);

  const markAllRead = async () => {
    await Promise.all(unread.map(notification => markRead.mutateAsync(notification.id)));
  };

  return (
    <div>
      <PageHeader
        title="Centre d’activité"
        subtitle={`${unread.length} non lue${unread.length > 1 ? 's' : ''} · ${pendingCount} en attente de synchronisation`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <OfflineStatus />
          <WeddingSelector
            weddings={weddings}
            activeWeddingId={activeWeddingId}
            onSelect={setActiveWeddingId}
          />
        </div>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Non lues</p>
          <p className="mt-1 text-2xl font-bold">{unread.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">À synchroniser</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Connexion</p>
          <div className={cn('mt-2 flex items-center gap-2 font-semibold', online ? 'text-green-700' : 'text-amber-700')}>
            {online ? <CheckCheck className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
            {online ? 'En ligne' : 'Mode hors ligne'}
          </div>
          {lastSyncedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dernière synchro {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: fr })}
            </p>
          )}
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="unread">
              Non lues
              {unread.length > 0 && <Badge className="ml-2 h-5 px-1.5">{unread.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sync">
              Synchronisation
              {pendingCount > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{pendingCount}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'sync' ? (
          <Button onClick={() => void sync()} disabled={!online || syncing || pendingCount === 0}>
            <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
            Synchroniser maintenant
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void markAllRead()} disabled={unread.length === 0 || markRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {tab === 'sync' ? (
        queuedOperations.length === 0 ? (
          <EmptyState
            icon={CheckCheck}
            title="Tout est synchronisé"
            description="Aucune action locale n’attend d’être envoyée au serveur."
          />
        ) : (
          <div className="max-w-3xl space-y-2">
            {queuedOperations.map(operation => (
              <Card key={operation.id} className="flex items-start gap-3 p-4">
                <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{operation.label}</p>
                    <Badge variant={operation.lastError ? 'destructive' : 'secondary'}>
                      {operation.lastError ? 'À réessayer' : 'En attente'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enregistré {formatDistanceToNow(new Date(operation.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                  {operation.lastError && <p className="mt-1 text-xs text-red-600">{operation.lastError}</p>}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : visibleNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          description="Les commandes, arrivées et alertes apparaîtront ici."
        />
      ) : (
        <div className="max-w-3xl space-y-2">
          {visibleNotifications.map(notif => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const Icon = config.icon;
            return (
              <Card
                key={notif.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 p-4 transition-all hover:shadow-sm',
                  !notif.is_read && 'border-primary/20 bg-primary/5',
                )}
                onClick={() => !notif.is_read && markRead.mutate(notif.id)}
              >
                <div className={cn('shrink-0 rounded-lg p-2', config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', !notif.is_read && 'font-semibold')}>{notif.title}</p>
                    {!notif.is_read && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{notif.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
