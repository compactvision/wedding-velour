import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    Image,
    MapPin,
    Pencil,
    Play,
    Plus,
    Trash2,
    UserRound,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
    ScheduleItem,
    ScheduleItemPayload,
    tenantSchedule,
} from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const categories: Record<
    ScheduleItem['category'],
    { icon: string; label: string }
> = {
    ceremony: { icon: '✦', label: 'Cérémonie' },
    reception: { icon: '🥂', label: 'Réception' },
    dinner: { icon: '🍽️', label: 'Repas' },
    dance: { icon: '♫', label: 'Danse' },
    speech: { icon: '🎤', label: 'Prise de parole' },
    activity: { icon: '◎', label: 'Activité' },
    session: { icon: '▣', label: 'Session' },
    break: { icon: '☕', label: 'Pause' },
    logistics: { icon: '↗', label: 'Logistique' },
    other: { icon: '•', label: 'Autre' },
};

function toInputDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000)
        .toISOString()
        .slice(0, 16);
}

type ScheduleFormProps = {
    open: boolean;
    item: ScheduleItem | null;
    defaultStart: string | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: ScheduleItemPayload) => void;
};

function ScheduleFormDialog({
    open,
    item,
    defaultStart,
    pending,
    onOpenChange,
    onSave,
}: ScheduleFormProps) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        category: 'other' as ScheduleItem['category'],
        location: '',
        responsible_name: '',
        visibility: 'public' as ScheduleItem['visibility'],
        notify_all: false,
        image_url: '',
        sub_details_text: '',
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fallback = defaultStart
            ? toInputDateTime(defaultStart)
            : toInputDateTime(new Date().toISOString());
        setForm({
            title: item?.title || '',
            description: item?.description || '',
            starts_at: toInputDateTime(item?.starts_at) || fallback,
            ends_at: toInputDateTime(item?.ends_at),
            category: item?.category || 'other',
            location: item?.location || '',
            responsible_name: item?.responsible_name || '',
            visibility: item?.visibility || 'public',
            notify_all: item?.notify_all || false,
            image_url: item?.image_url || '',
            sub_details_text: (item?.sub_details || []).join('\n'),
        });
    }, [open, item, defaultStart]);

    const uploadImage = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const result = await base44.integrations.Core.UploadFile({ file });
            setForm((current) => ({
                ...current,
                image_url: result.file_url,
            }));
        } finally {
            setUploading(false);
        }
    };

    const submit = () => {
        onSave({
            title: form.title.trim(),
            description: form.description.trim() || null,
            starts_at: new Date(form.starts_at).toISOString(),
            ends_at: form.ends_at
                ? new Date(form.ends_at).toISOString()
                : null,
            category: form.category,
            location: form.location.trim() || null,
            responsible_name: form.responsible_name.trim() || null,
            visibility: form.visibility,
            notify_all: form.notify_all,
            image_url: form.image_url.trim() || null,
            sub_details: form.sub_details_text
                .split('\n')
                .map((detail) => detail.trim())
                .filter(Boolean),
        });
    };

    const invalidEnd =
        Boolean(form.ends_at) &&
        new Date(form.ends_at).getTime() <=
            new Date(form.starts_at).getTime();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {item ? 'Modifier l’activité' : 'Nouvelle activité'}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label htmlFor="schedule-title">Titre</Label>
                        <Input
                            id="schedule-title"
                            value={form.title}
                            onChange={(event) =>
                                setForm({ ...form, title: event.target.value })
                            }
                            placeholder="Accueil des participants"
                        />
                    </div>
                    <div>
                        <Label htmlFor="schedule-start">Début</Label>
                        <Input
                            id="schedule-start"
                            type="datetime-local"
                            value={form.starts_at}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    starts_at: event.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor="schedule-end">Fin facultative</Label>
                        <Input
                            id="schedule-end"
                            type="datetime-local"
                            value={form.ends_at}
                            onChange={(event) =>
                                setForm({ ...form, ends_at: event.target.value })
                            }
                        />
                        {invalidEnd && (
                            <p className="mt-1 text-xs text-destructive">
                                La fin doit être postérieure au début.
                            </p>
                        )}
                    </div>
                    <div>
                        <Label>Catégorie</Label>
                        <Select
                            value={form.category}
                            onValueChange={(category: ScheduleItem['category']) =>
                                setForm({ ...form, category })
                            }
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(categories).map(
                                    ([value, category]) => (
                                        <SelectItem key={value} value={value}>
                                            {category.icon} {category.label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Visibilité</Label>
                        <Select
                            value={form.visibility}
                            onValueChange={(
                                visibility: ScheduleItem['visibility'],
                            ) => setForm({ ...form, visibility })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">
                                    Publique — visible par les invités
                                </SelectItem>
                                <SelectItem value="internal">
                                    Interne — équipe uniquement
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="schedule-location">Lieu</Label>
                        <Input
                            id="schedule-location"
                            value={form.location}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    location: event.target.value,
                                })
                            }
                            placeholder="Hall principal"
                        />
                    </div>
                    <div>
                        <Label htmlFor="schedule-owner">Responsable</Label>
                        <Input
                            id="schedule-owner"
                            value={form.responsible_name}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    responsible_name: event.target.value,
                                })
                            }
                            placeholder="Équipe accueil"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="schedule-description">Description</Label>
                        <Textarea
                            id="schedule-description"
                            value={form.description}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value,
                                })
                            }
                            rows={3}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <Label htmlFor="schedule-details">
                            Étapes ou consignes
                        </Label>
                        <Textarea
                            id="schedule-details"
                            value={form.sub_details_text}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    sub_details_text: event.target.value,
                                })
                            }
                            placeholder={'Ouverture des portes\nBrief de l’équipe\nAccueil VIP'}
                            rows={3}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Une consigne par ligne.
                        </p>
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Illustration facultative</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                value={form.image_url}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        image_url: event.target.value,
                                    })
                                }
                                placeholder="/storage/uploads/programme.jpg"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="relative shrink-0 overflow-hidden"
                                disabled={uploading}
                            >
                                <Image className="mr-2 h-4 w-4" />
                                {uploading ? 'Import…' : 'Importer'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={(event) =>
                                        uploadImage(event.target.files?.[0])
                                    }
                                />
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <Switch
                            checked={form.notify_all}
                            onCheckedChange={(notify_all) =>
                                setForm({ ...form, notify_all })
                            }
                        />
                        <Label>Préparer une notification aux invités</Label>
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
                            !form.starts_at ||
                            invalidEnd ||
                            pending
                        }
                    >
                        {pending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Timeline() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const canUpdate = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('schedule.update'),
    );
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

    const scheduleQuery = useQuery({
        queryKey: ['tenant-schedule', eventId],
        queryFn: () => tenantSchedule.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const schedule = scheduleQuery.data?.data;
    const items = schedule?.items || [];

    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['tenant-schedule', eventId],
        });
    const createMutation = useMutation({
        mutationFn: (data: ScheduleItemPayload) =>
            tenantSchedule.create(organizationSlug, eventSlug, data),
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
            data: ScheduleItemPayload;
        }) =>
            tenantSchedule.update(
                organizationSlug,
                eventSlug,
                id,
                data,
            ),
        onSuccess: () => {
            refresh();
            setShowForm(false);
            setEditingItem(null);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            tenantSchedule.delete(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });

    const groupedItems = useMemo(() => {
        const groups = new Map<string, ScheduleItem[]>();
        items.forEach((item) => {
            const key = item.starts_at
                ? item.starts_at.slice(0, 10)
                : 'date-inconnue';
            groups.set(key, [...(groups.get(key) || []), item]);
        });
        return [...groups.entries()];
    }, [items]);

    const handleSave = (data: ScheduleItemPayload) => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (!workspace) {
        return (
            <EmptyState
                icon={CalendarDays}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de construire son programme."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (scheduleQuery.isError) {
        return (
            <EmptyState
                icon={CalendarDays}
                title="Module non disponible"
                description="Activez le module Programme pour cet événement."
                actionLabel="Voir l’espace de travail"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const summary = schedule?.summary || {
        total: 0,
        upcoming: 0,
        in_progress: 0,
        completed: 0,
        public: 0,
    };

    return (
        <div>
            <PageHeader
                title="Programme & déroulé"
                subtitle={`${workspace.event.name} · ${summary.total} activités`}
            >
                <Button variant="outline" asChild>
                    <Link href="/onboarding">Changer d’événement</Link>
                </Button>
                {canUpdate && (
                    <Button
                        onClick={() => {
                            setEditingItem(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter une activité
                    </Button>
                )}
            </PageHeader>

            <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'À venir',
                        value: summary.upcoming,
                        icon: Clock,
                        color: 'text-blue-700 bg-blue-50',
                    },
                    {
                        label: 'En cours',
                        value: summary.in_progress,
                        icon: Play,
                        color: 'text-amber-700 bg-amber-50',
                    },
                    {
                        label: 'Terminées',
                        value: summary.completed,
                        icon: CheckCircle2,
                        color: 'text-emerald-700 bg-emerald-50',
                    },
                    {
                        label: 'Visibles aux invités',
                        value: summary.public,
                        icon: Eye,
                        color: 'text-violet-700 bg-violet-50',
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

            {scheduleQuery.isLoading ? (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                    Chargement du programme…
                </Card>
            ) : items.length === 0 ? (
                <EmptyState
                    icon={CalendarDays}
                    title="Programme vide"
                    description="Ajoutez les temps forts, les consignes et les responsables de l’événement."
                    actionLabel={canUpdate ? 'Créer une activité' : undefined}
                    onAction={
                        canUpdate
                            ? () => {
                                  setEditingItem(null);
                                  setShowForm(true);
                              }
                            : undefined
                    }
                />
            ) : (
                <div className="space-y-8">
                    {groupedItems.map(([date, dayItems]) => (
                        <section key={date}>
                            <div className="mb-4 flex items-center gap-3">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                <h2 className="font-display text-lg font-semibold capitalize">
                                    {date === 'date-inconnue'
                                        ? 'Date à définir'
                                        : format(
                                              new Date(`${date}T12:00:00`),
                                              'EEEE d MMMM yyyy',
                                              { locale: fr },
                                          )}
                                </h2>
                                <Badge variant="outline">
                                    {dayItems.length} activité
                                    {dayItems.length > 1 ? 's' : ''}
                                </Badge>
                            </div>
                            <div className="relative">
                                <div className="absolute bottom-0 left-5 top-0 w-px bg-border sm:left-6" />
                                <div className="space-y-4">
                                    {dayItems.map((item) => {
                                        const category =
                                            categories[item.category] ||
                                            categories.other;
                                        return (
                                            <div
                                                key={item.id}
                                                className="relative flex gap-3 sm:gap-4 sm:pl-2"
                                            >
                                                <div
                                                    className={cn(
                                                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base sm:h-12 sm:w-12',
                                                        item.status === 'completed'
                                                            ? 'border-emerald-300 bg-emerald-50'
                                                            : item.status ===
                                                                'in_progress'
                                                              ? 'border-primary bg-primary/10'
                                                              : 'border-border bg-card',
                                                    )}
                                                >
                                                    {category.icon}
                                                </div>
                                                <Card className="min-w-0 flex-1 overflow-hidden p-4 transition-shadow hover:shadow-md">
                                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                                <span className="font-mono text-sm font-semibold text-primary">
                                                                    {item.starts_at
                                                                        ? format(
                                                                              new Date(
                                                                                  item.starts_at,
                                                                              ),
                                                                              'HH:mm',
                                                                          )
                                                                        : item.time}
                                                                    {item.ends_at &&
                                                                        `–${format(new Date(item.ends_at), 'HH:mm')}`}
                                                                </span>
                                                                <StatusBadge
                                                                    status={
                                                                        item.status
                                                                    }
                                                                />
                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1"
                                                                >
                                                                    {item.visibility ===
                                                                    'public' ? (
                                                                        <Eye className="h-3 w-3" />
                                                                    ) : (
                                                                        <EyeOff className="h-3 w-3" />
                                                                    )}
                                                                    {item.visibility ===
                                                                    'public'
                                                                        ? 'Public'
                                                                        : 'Interne'}
                                                                </Badge>
                                                            </div>
                                                            <h3 className="font-display text-lg font-semibold">
                                                                {item.title}
                                                            </h3>
                                                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                                                                {category.label}
                                                            </p>
                                                            {item.description && (
                                                                <p className="mt-2 text-sm text-muted-foreground">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>
                                                            )}
                                                            {(item.location ||
                                                                item.responsible_name) && (
                                                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                                    {item.location && (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="h-3.5 w-3.5" />
                                                                            {
                                                                                item.location
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {item.responsible_name && (
                                                                        <span className="flex items-center gap-1">
                                                                            <UserRound className="h-3.5 w-3.5" />
                                                                            {
                                                                                item.responsible_name
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {item.sub_details.length >
                                                                0 && (
                                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                                    {item.sub_details.map(
                                                                        (
                                                                            detail,
                                                                            index,
                                                                        ) => (
                                                                            <span
                                                                                key={`${item.id}-${index}`}
                                                                                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                                                                            >
                                                                                {
                                                                                    detail
                                                                                }
                                                                            </span>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                            {item.image_url && (
                                                                <img
                                                                    src={
                                                                        item.image_url
                                                                    }
                                                                    alt=""
                                                                    className="mt-4 aspect-[16/6] w-full rounded-xl object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        {canUpdate && (
                                                            <div className="flex shrink-0 flex-wrap gap-1">
                                                                {item.status ===
                                                                    'upcoming' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            updateMutation.mutate(
                                                                                {
                                                                                    id: item.id,
                                                                                    data: {
                                                                                        status: 'in_progress',
                                                                                    },
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <Play className="mr-1.5 h-3.5 w-3.5" />
                                                                        Démarrer
                                                                    </Button>
                                                                )}
                                                                {item.status ===
                                                                    'in_progress' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            updateMutation.mutate(
                                                                                {
                                                                                    id: item.id,
                                                                                    data: {
                                                                                        status: 'completed',
                                                                                    },
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                                                        Terminer
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setEditingItem(
                                                                            item,
                                                                        );
                                                                        setShowForm(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    aria-label={`Modifier ${item.title}`}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-destructive"
                                                                    onClick={() => {
                                                                        if (
                                                                            window.confirm(
                                                                                `Supprimer « ${item.title} » ?`,
                                                                            )
                                                                        ) {
                                                                            deleteMutation.mutate(
                                                                                item.id,
                                                                            );
                                                                        }
                                                                    }}
                                                                    aria-label={`Supprimer ${item.title}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <ScheduleFormDialog
                open={showForm}
                item={editingItem}
                defaultStart={workspace.event.starts_at}
                pending={createMutation.isPending || updateMutation.isPending}
                onOpenChange={(open) => {
                    setShowForm(open);
                    if (!open) setEditingItem(null);
                }}
                onSave={handleSave}
            />
        </div>
    );
}
