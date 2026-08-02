import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    AlertTriangle,
    Bell,
    CalendarClock,
    CheckCheck,
    CloudOff,
    Info,
    Megaphone,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Communication,
    CommunicationPayload,
    tenantCommunications,
} from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import OfflineStatus from '@/components/shared/OfflineStatus';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import { getQueuedOperations, OfflineOperation } from '@/lib/offline';

const audiences: Record<
    Communication['audience'],
    { label: string; description: string }
> = {
    all_guests: {
        label: 'Tous les invités actifs',
        description: 'Invités confirmés ou en attente de réponse',
    },
    confirmed_guests: {
        label: 'Invités confirmés',
        description: 'Uniquement les personnes ayant confirmé',
    },
    pending_rsvp: {
        label: 'Réponses en attente',
        description: 'Invités n’ayant pas encore répondu',
    },
    team: {
        label: 'Équipe',
        description: 'Membres opérationnels de l’événement',
    },
};

const communicationTypes: Record<
    Extract<
        Communication['type'],
        'announcement' | 'reminder' | 'schedule' | 'rsvp' | 'alert' | 'info'
    >,
    string
> = {
    announcement: 'Annonce',
    reminder: 'Rappel',
    schedule: 'Programme',
    rsvp: 'RSVP',
    alert: 'Alerte',
    info: 'Information',
};

const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    scheduled: 'Planifiée',
    sent: 'Publiée',
    delivered: 'Livrée',
};

const typeIcons: Record<string, { icon: LucideIcon; color: string }> = {
    alert: { icon: AlertTriangle, color: 'bg-amber-50 text-amber-700' },
    announcement: { icon: Megaphone, color: 'bg-violet-50 text-violet-700' },
    reminder: { icon: CalendarClock, color: 'bg-blue-50 text-blue-700' },
    schedule: { icon: CalendarClock, color: 'bg-indigo-50 text-indigo-700' },
    rsvp: { icon: Users, color: 'bg-emerald-50 text-emerald-700' },
    info: { icon: Info, color: 'bg-sky-50 text-sky-700' },
    order: { icon: Bell, color: 'bg-green-50 text-green-700' },
    timeline: { icon: CalendarClock, color: 'bg-purple-50 text-purple-700' },
    photo: { icon: Bell, color: 'bg-pink-50 text-pink-700' },
};

function toInputDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000)
        .toISOString()
        .slice(0, 16);
}

type CommunicationDialogProps = {
    open: boolean;
    communication: Communication | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: CommunicationPayload) => void;
};

function CommunicationDialog({
    open,
    communication,
    pending,
    onOpenChange,
    onSave,
}: CommunicationDialogProps) {
    const [form, setForm] = useState({
        title: '',
        message: '',
        type: 'announcement' as CommunicationPayload['type'],
        audience: 'all_guests' as CommunicationPayload['audience'],
        scheduled_at: '',
        action_url: '',
    });

    useEffect(() => {
        setForm({
            title: communication?.title || '',
            message: communication?.message || '',
            type: communication?.type || 'announcement',
            audience: communication?.audience || 'all_guests',
            scheduled_at: toInputDateTime(communication?.scheduled_at),
            action_url: communication?.action_url || '',
        });
    }, [open, communication]);

    const submit = () =>
        onSave({
            title: form.title.trim(),
            message: form.message.trim(),
            type: form.type,
            audience: form.audience,
            scheduled_at: form.scheduled_at
                ? new Date(form.scheduled_at).toISOString()
                : null,
            action_url: form.action_url.trim() || null,
        });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {communication
                            ? 'Modifier la communication'
                            : 'Nouvelle communication'}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label htmlFor="communication-title">Titre</Label>
                        <Input
                            id="communication-title"
                            value={form.title}
                            onChange={(event) =>
                                setForm({ ...form, title: event.target.value })
                            }
                            placeholder="Le programme a été mis à jour"
                        />
                    </div>
                    <div>
                        <Label>Type</Label>
                        <Select
                            value={form.type}
                            onValueChange={(
                                type: CommunicationPayload['type'],
                            ) => setForm({ ...form, type })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(communicationTypes).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Destinataires</Label>
                        <Select
                            value={form.audience}
                            onValueChange={(
                                audience: CommunicationPayload['audience'],
                            ) => setForm({ ...form, audience })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(audiences).map(
                                    ([value, audience]) => (
                                        <SelectItem key={value} value={value}>
                                            {audience.label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                        {form.audience && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {audiences[form.audience].description}
                            </p>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="communication-message">Message</Label>
                        <Textarea
                            id="communication-message"
                            value={form.message}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    message: event.target.value,
                                })
                            }
                            rows={5}
                            placeholder="Écrivez un message clair et directement utile aux destinataires."
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {form.message.length}/5000
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="communication-schedule">
                            Publication planifiée
                        </Label>
                        <Input
                            id="communication-schedule"
                            type="datetime-local"
                            value={form.scheduled_at}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    scheduled_at: event.target.value,
                                })
                            }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Laissez vide pour enregistrer un brouillon.
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="communication-link">
                            Lien facultatif
                        </Label>
                        <Input
                            id="communication-link"
                            value={form.action_url}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    action_url: event.target.value,
                                })
                            }
                            placeholder="/timeline"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={
                            !form.title.trim() ||
                            !form.message.trim() ||
                            pending
                        }
                    >
                        {form.scheduled_at ? 'Planifier' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Notifications() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const canUpdate = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('notifications.update'),
    );
    const { online, pendingCount, syncing, lastSyncedAt, sync } =
        useOfflineSync();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'campaigns' | 'activity' | 'sync'>(
        'campaigns',
    );
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Communication | null>(null);
    const [queuedOperations, setQueuedOperations] = useState<
        OfflineOperation[]
    >([]);

    const communicationsQuery = useQuery({
        queryKey: ['tenant-communications', eventId],
        queryFn: () =>
            tenantCommunications.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
        refetchInterval: online ? 15_000 : false,
    });
    const communications = communicationsQuery.data?.data;
    const campaigns = communications?.campaigns || [];
    const activity = communications?.activity || [];
    const unread = activity.filter((item) => !item.is_read);

    useEffect(() => {
        const refreshQueue = async () =>
            setQueuedOperations(await getQueuedOperations());
        const refreshAll = () => {
            void refreshQueue();
            if (navigator.onLine) {
                void queryClient.invalidateQueries({
                    queryKey: ['tenant-communications', eventId],
                });
            }
        };
        void refreshQueue();
        window.addEventListener('offline-queue-changed', refreshQueue);
        window.addEventListener('offline-sync-complete', refreshAll);
        return () => {
            window.removeEventListener('offline-queue-changed', refreshQueue);
            window.removeEventListener('offline-sync-complete', refreshAll);
        };
    }, [eventId, queryClient]);

    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['tenant-communications', eventId],
        });
    const createMutation = useMutation({
        mutationFn: (data: CommunicationPayload) =>
            tenantCommunications.create(organizationSlug, eventSlug, data),
        onSuccess: () => {
            refresh();
            setShowForm(false);
        },
    });
    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: CommunicationPayload;
        }) =>
            tenantCommunications.update(
                organizationSlug,
                eventSlug,
                id,
                data,
            ),
        onSuccess: () => {
            refresh();
            setShowForm(false);
            setEditing(null);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            tenantCommunications.delete(
                organizationSlug,
                eventSlug,
                id,
            ),
        onSuccess: refresh,
    });
    const publishMutation = useMutation({
        mutationFn: (id: string) =>
            tenantCommunications.publish(
                organizationSlug,
                eventSlug,
                id,
            ),
        onSuccess: refresh,
    });
    const markReadMutation = useMutation({
        mutationFn: (id: string) =>
            tenantCommunications.markRead(
                organizationSlug,
                eventSlug,
                id,
            ),
        onSuccess: refresh,
    });
    const markAllReadMutation = useMutation({
        mutationFn: () =>
            tenantCommunications.markAllRead(
                organizationSlug,
                eventSlug,
            ),
        onSuccess: refresh,
    });

    const handleSave = (data: CommunicationPayload) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const sortedCampaigns = useMemo(
        () =>
            [...campaigns].sort((a, b) => {
                const rank = { scheduled: 0, draft: 1, sent: 2, delivered: 3 };
                return (
                    rank[a.delivery_status] - rank[b.delivery_status] ||
                    (b.created_at || '').localeCompare(a.created_at || '')
                );
            }),
        [campaigns],
    );

    if (!workspace) {
        return (
            <EmptyState
                icon={Bell}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de communiquer avec ses invités."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (communicationsQuery.isError) {
        return (
            <EmptyState
                icon={Bell}
                title="Module non disponible"
                description="Activez le module Notifications pour cet événement."
                actionLabel="Voir l’espace de travail"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const summary = communications?.summary || {
        drafts: 0,
        scheduled: 0,
        sent: 0,
        unread_activity: 0,
        reachable_guests: 0,
    };

    return (
        <div>
            <PageHeader
                title="Notifications & communications"
                subtitle={`${workspace.event.name} · ${summary.reachable_guests} invités joignables dans Planivo`}
            >
                <OfflineStatus />
                <Button variant="outline" asChild>
                    <Link href="/onboarding">Changer d’événement</Link>
                </Button>
                {canUpdate && (
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau message
                    </Button>
                )}
            </PageHeader>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'Brouillons',
                        value: summary.drafts,
                        icon: Pencil,
                        color: 'bg-slate-50 text-slate-700',
                    },
                    {
                        label: 'Planifiées',
                        value: summary.scheduled,
                        icon: CalendarClock,
                        color: 'bg-blue-50 text-blue-700',
                    },
                    {
                        label: 'Publiées',
                        value: summary.sent,
                        icon: Send,
                        color: 'bg-emerald-50 text-emerald-700',
                    },
                    {
                        label: 'Activités non lues',
                        value: summary.unread_activity,
                        icon: Bell,
                        color: 'bg-amber-50 text-amber-700',
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn('rounded-xl p-2', color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {label}
                                </p>
                                <p className="text-2xl font-semibold">{value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={tab}
                    onValueChange={(value) =>
                        setTab(value as 'campaigns' | 'activity' | 'sync')
                    }
                >
                    <TabsList>
                        <TabsTrigger value="campaigns">
                            Communications
                            {campaigns.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {campaigns.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="activity">
                            Activité
                            {unread.length > 0 && (
                                <Badge className="ml-2">{unread.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="sync">
                            Synchronisation
                            {pendingCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {pendingCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {tab === 'activity' && (
                    <Button
                        variant="outline"
                        disabled={
                            unread.length === 0 ||
                            markAllReadMutation.isPending
                        }
                        onClick={() => markAllReadMutation.mutate()}
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Tout marquer comme lu
                    </Button>
                )}
                {tab === 'sync' && (
                    <Button
                        onClick={() => void sync()}
                        disabled={!online || syncing || pendingCount === 0}
                    >
                        <RefreshCw
                            className={cn(
                                'mr-2 h-4 w-4',
                                syncing && 'animate-spin',
                            )}
                        />
                        Synchroniser
                    </Button>
                )}
            </div>

            {communicationsQuery.isLoading ? (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                    Chargement des communications…
                </Card>
            ) : tab === 'campaigns' ? (
                sortedCampaigns.length === 0 ? (
                    <EmptyState
                        icon={Megaphone}
                        title="Aucune communication"
                        description="Créez une annonce ou un rappel qui apparaîtra directement dans l’invitation des destinataires."
                        actionLabel={
                            canUpdate ? 'Créer un message' : undefined
                        }
                        onAction={
                            canUpdate
                                ? () => {
                                      setEditing(null);
                                      setShowForm(true);
                                  }
                                : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {sortedCampaigns.map((communication) => {
                            const config =
                                typeIcons[communication.type] || typeIcons.info;
                            const Icon = config.icon;
                            const editable =
                                communication.delivery_status !== 'sent';
                            return (
                                <Card
                                    key={communication.id}
                                    className="flex flex-col p-5"
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={cn(
                                                'rounded-xl p-2.5',
                                                config.color,
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold">
                                                    {communication.title}
                                                </h3>
                                                <Badge
                                                    variant={
                                                        communication.delivery_status ===
                                                        'sent'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                >
                                                    {
                                                        statusLabels[
                                                            communication
                                                                .delivery_status
                                                        ]
                                                    }
                                                </Badge>
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                {communication.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="secondary">
                                            {audiences[communication.audience]
                                                ?.label ||
                                                communication.audience}
                                        </Badge>
                                        {communication.scheduled_at &&
                                            communication.delivery_status ===
                                                'scheduled' && (
                                                <span>
                                                    Prévue le{' '}
                                                    {format(
                                                        new Date(
                                                            communication.scheduled_at,
                                                        ),
                                                        'd MMM à HH:mm',
                                                        { locale: fr },
                                                    )}
                                                </span>
                                            )}
                                        {communication.sent_at && (
                                            <span>
                                                Publiée{' '}
                                                {formatDistanceToNow(
                                                    new Date(
                                                        communication.sent_at,
                                                    ),
                                                    {
                                                        addSuffix: true,
                                                        locale: fr,
                                                    },
                                                )}{' '}
                                                ·{' '}
                                                {
                                                    communication.recipient_count
                                                }{' '}
                                                destinataire
                                                {communication.recipient_count >
                                                1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                        )}
                                    </div>
                                    {canUpdate && editable && (
                                        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditing(communication);
                                                    setShowForm(true);
                                                }}
                                            >
                                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                Modifier
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            `Supprimer « ${communication.title} » ?`,
                                                        )
                                                    ) {
                                                        deleteMutation.mutate(
                                                            communication.id,
                                                        );
                                                    }
                                                }}
                                            >
                                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                Supprimer
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={
                                                    publishMutation.isPending
                                                }
                                                onClick={() =>
                                                    publishMutation.mutate(
                                                        communication.id,
                                                    )
                                                }
                                            >
                                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                                Publier maintenant
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )
            ) : tab === 'activity' ? (
                activity.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="Aucune activité"
                        description="Les confirmations, commandes et alertes opérationnelles apparaîtront ici."
                    />
                ) : (
                    <div className="max-w-3xl space-y-2">
                        {activity.map((item) => {
                            const config =
                                typeIcons[item.type] || typeIcons.info;
                            const Icon = config.icon;
                            return (
                                <Card
                                    key={item.id}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 p-4 transition-shadow hover:shadow-sm',
                                        !item.is_read &&
                                            'border-primary/20 bg-primary/5',
                                    )}
                                    onClick={() =>
                                        !item.is_read &&
                                        markReadMutation.mutate(item.id)
                                    }
                                >
                                    <div
                                        className={cn(
                                            'rounded-lg p-2',
                                            config.color,
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p
                                                className={cn(
                                                    'text-sm font-medium',
                                                    !item.is_read &&
                                                        'font-semibold',
                                                )}
                                            >
                                                {item.title}
                                            </p>
                                            {!item.is_read && (
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {item.message}
                                        </p>
                                        {item.created_at && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatDistanceToNow(
                                                    new Date(item.created_at),
                                                    {
                                                        addSuffix: true,
                                                        locale: fr,
                                                    },
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )
            ) : queuedOperations.length === 0 ? (
                <EmptyState
                    icon={online ? CheckCheck : CloudOff}
                    title={
                        online
                            ? 'Tout est synchronisé'
                            : 'Mode hors ligne actif'
                    }
                    description={
                        lastSyncedAt
                            ? `Dernière synchronisation ${formatDistanceToNow(
                                  new Date(lastSyncedAt),
                                  { addSuffix: true, locale: fr },
                              )}.`
                            : 'Aucune opération locale en attente.'
                    }
                />
            ) : (
                <div className="max-w-3xl space-y-2">
                    {queuedOperations.map((operation) => (
                        <Card
                            key={operation.id}
                            className="flex items-start gap-3 p-4"
                        >
                            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                <RefreshCw className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold">
                                        {operation.label}
                                    </p>
                                    <Badge
                                        variant={
                                            operation.lastError
                                                ? 'destructive'
                                                : 'secondary'
                                        }
                                    >
                                        {operation.lastError
                                            ? 'À réessayer'
                                            : 'En attente'}
                                    </Badge>
                                </div>
                                {operation.lastError && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {operation.lastError}
                                    </p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <CommunicationDialog
                open={showForm}
                communication={editing}
                pending={createMutation.isPending || updateMutation.isPending}
                onOpenChange={(open) => {
                    setShowForm(open);
                    if (!open) setEditing(null);
                }}
                onSave={handleSave}
            />
        </div>
    );
}
