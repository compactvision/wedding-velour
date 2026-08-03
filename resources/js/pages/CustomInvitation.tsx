import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Heart,
    Image,
    MailOpen,
    Palette,
    Save,
    Users,
    UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import type { InvitationConfiguration } from '@/api/tenantClient';
import { tenantInvitations } from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const fallbackInvitation: InvitationConfiguration = {
    eyebrow: 'Vous êtes cordialement invité(e)',
    title: '',
    greeting: 'Cher(e) {guest}',
    body: 'Nous serions honorés de partager ce moment avec vous. Rejoignez-nous pour vivre ensemble cet événement.',
    rsvp_question: 'Serez-vous présent(e) ?',
    accept_label: 'Oui, je serai là !',
    decline_label: 'Je ne pourrai pas venir',
    footer: 'Merci et à très vite',
    background_image: '',
    accent_color: '#B98235',
    couple_names: '',
    couple_initials: '',
    dress_code: '',
    rsvp_deadline: null,
    show_event_details: true,
};

export default function CustomInvitation() {
    const workspace = (usePage().props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const canUpdate = Boolean(
        workspace?.permissions?.includes('*') ||
        workspace?.permissions?.includes('invitations.update'),
    );
    const queryClient = useQueryClient();
    const [form, setForm] =
        useState<InvitationConfiguration>(fallbackInvitation);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);

    const {
        data: settings,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['tenant-invitation', eventId],
        queryFn: () => tenantInvitations.get(organizationSlug, eventSlug),
        enabled: !!eventId,
    });

    useEffect(() => {
        if (!settings?.data.configuration) {
            return;
        }

        // The form is an editable local draft initialized from the remote event settings.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(settings.data.configuration);
    }, [settings]);

    const updateMutation = useMutation({
        mutationFn: () =>
            tenantInvitations.update(organizationSlug, eventSlug, form),
        onSuccess: (response) => {
            queryClient.setQueryData(['tenant-invitation', eventId], response);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        },
    });

    const uploadBackground = async (file?: File) => {
        if (!file) {
            return;
        }

        setUploading(true);

        try {
            const result = await base44.integrations.Core.UploadFile({ file });
            setForm((current) => ({
                ...current,
                background_image: result.file_url,
            }));
        } finally {
            setUploading(false);
        }
    };

    const update = <Key extends keyof InvitationConfiguration>(
        key: Key,
        value: InvitationConfiguration[Key],
    ) => setForm((current) => ({ ...current, [key]: value }));

    if (!workspace) {
        return (
            <EmptyState
                icon={MailOpen}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de personnaliser son invitation."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (isError) {
        return (
            <EmptyState
                icon={MailOpen}
                title="Invitation indisponible"
                description="Le module Invitations n’est pas activé ou vous ne disposez pas des droits nécessaires."
            />
        );
    }

    const summary = settings?.data.rsvp_summary;
    const eventDate = workspace.event.starts_at
        ? new Date(workspace.event.starts_at)
        : null;

    return (
        <div>
            <PageHeader
                title="Invitation & RSVP"
                subtitle={`Personnalisation tenantée · ${workspace.event.name}`}
            >
                <Button asChild variant="outline">
                    <Link href="/onboarding">{workspace.event.name}</Link>
                </Button>
                {canUpdate && (
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={isLoading || updateMutation.isPending}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {updateMutation.isPending
                            ? 'Enregistrement…'
                            : 'Enregistrer'}
                    </Button>
                )}
            </PageHeader>

            {saved && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Invitation mise à jour pour cet événement.
                </div>
            )}

            {(settings?.data.templates.length || 0) > 0 && (
                <Card className="mb-6 p-5">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
                                Modèles pour {settings?.data.event_type}
                            </p>
                            <h2 className="mt-1 font-display text-xl font-semibold">
                                Choisissez le ton de votre invitation
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Le texte reste entièrement modifiable.
                        </p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {settings?.data.templates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                disabled={!canUpdate}
                                onClick={() => setForm(template.configuration)}
                                className="rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold">
                                        {template.name}
                                    </span>
                                    {template.is_default && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                            Recommandé
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                                    {template.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {summary && (
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        icon={Users}
                        label="Invités"
                        value={summary.guests}
                    />
                    <SummaryCard
                        icon={CheckCircle2}
                        label="Confirmés"
                        value={summary.confirmed_people}
                        tone="emerald"
                    />
                    <SummaryCard
                        icon={Clock3}
                        label="En attente"
                        value={summary.pending_guests}
                        tone="amber"
                    />
                    <SummaryCard
                        icon={UserX}
                        label="Déclinés"
                        value={summary.declined_guests}
                        tone="rose"
                    />
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
                <Tabs defaultValue="textes" className="min-w-0">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="textes">Textes</TabsTrigger>
                        <TabsTrigger value="visuel">Visuel</TabsTrigger>
                        <TabsTrigger value="rsvp">RSVP</TabsTrigger>
                    </TabsList>

                    <TabsContent value="textes" className="mt-4">
                        <Card className="space-y-5 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Petite phrase du haut">
                                    <Input
                                        value={form.eyebrow}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'eyebrow',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Titre affiché">
                                    <Input
                                        value={form.title}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update('title', event.target.value)
                                        }
                                    />
                                </Field>
                            </div>
                            <Field label="Salutation">
                                <Input
                                    value={form.greeting}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update('greeting', event.target.value)
                                    }
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Utilisez {'{guest}'} pour insérer le nom.
                                </p>
                            </Field>
                            <Field label="Message principal">
                                <Textarea
                                    rows={7}
                                    value={form.body}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update('body', event.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Pied de carte">
                                <Input
                                    value={form.footer}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update('footer', event.target.value)
                                    }
                                />
                            </Field>
                        </Card>
                    </TabsContent>

                    <TabsContent value="visuel" className="mt-4">
                        <Card className="space-y-5 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Noms des mariés">
                                    <Input
                                        value={form.couple_names}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'couple_names',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex. Johan & Rose"
                                    />
                                </Field>
                                <Field label="Initiales du sceau">
                                    <Input
                                        value={form.couple_initials}
                                        disabled={!canUpdate}
                                        maxLength={5}
                                        onChange={(event) =>
                                            update(
                                                'couple_initials',
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="Ex. J&R"
                                    />
                                </Field>
                            </div>
                            <Field label="Dress code">
                                <Textarea
                                    rows={3}
                                    value={form.dress_code}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update('dress_code', event.target.value)
                                    }
                                    placeholder="Ex. Tenue de soirée · Tons champagne et sauge"
                                />
                            </Field>
                            <Field label="Image de fond">
                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                    <Input
                                        value={form.background_image}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'background_image',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="/storage/uploads/invitation.jpg"
                                    />
                                    {canUpdate && (
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
                                                    uploadBackground(
                                                        event.target.files?.[0],
                                                    )
                                                }
                                            />
                                        </Button>
                                    )}
                                </div>
                            </Field>
                            <Field label="Couleur d’accent">
                                <div className="mt-2 flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={form.accent_color}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'accent_color',
                                                event.target.value,
                                            )
                                        }
                                        className="h-11 w-16 rounded-lg border border-border bg-background"
                                    />
                                    <Input
                                        value={form.accent_color}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'accent_color',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </Field>
                            <div className="flex items-center justify-between rounded-xl border border-border p-4">
                                <div>
                                    <p className="text-sm font-medium">
                                        Afficher la date et le lieu
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Ces informations apparaîtront sur la
                                        page publique.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.show_event_details}
                                    disabled={!canUpdate}
                                    onCheckedChange={(checked) =>
                                        update('show_event_details', checked)
                                    }
                                />
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rsvp" className="mt-4">
                        <Card className="space-y-5 p-5">
                            <Field label="Question RSVP">
                                <Input
                                    value={form.rsvp_question}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update(
                                            'rsvp_question',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Bouton accepter">
                                    <Input
                                        value={form.accept_label}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'accept_label',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Bouton décliner">
                                    <Input
                                        value={form.decline_label}
                                        disabled={!canUpdate}
                                        onChange={(event) =>
                                            update(
                                                'decline_label',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <Field label="Date limite de réponse">
                                <Input
                                    type="date"
                                    value={form.rsvp_deadline || ''}
                                    disabled={!canUpdate}
                                    onChange={(event) =>
                                        update(
                                            'rsvp_deadline',
                                            event.target.value || null,
                                        )
                                    }
                                />
                            </Field>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="xl:sticky xl:top-6 xl:self-start">
                    <Card className="overflow-hidden border-0 shadow-xl">
                        <div className="relative min-h-[620px] bg-stone-950 p-5 text-white">
                            {form.background_image && (
                                <img
                                    src={form.background_image}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover opacity-55"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/75" />
                            <div className="relative flex min-h-[580px] flex-col justify-between rounded-xl border border-white/25 p-8 text-center">
                                <div>
                                    <div
                                        className="mx-auto mb-6 flex items-center justify-center gap-3"
                                        style={{ color: form.accent_color }}
                                    >
                                        <div className="h-px w-16 bg-current" />
                                        <Heart className="h-5 w-5 fill-current" />
                                        <div className="h-px w-16 bg-current" />
                                    </div>
                                    <p className="text-xs tracking-[0.28em] text-white/75 uppercase">
                                        {form.eyebrow}
                                    </p>
                                    <h2 className="mt-5 font-display text-4xl font-medium">
                                        {form.title || workspace.event.name}
                                    </h2>
                                    {form.show_event_details && (
                                        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80">
                                            <CalendarDays className="h-4 w-4" />
                                            {eventDate
                                                ? format(
                                                      eventDate,
                                                      'd MMMM yyyy',
                                                      { locale: fr },
                                                  )
                                                : 'Date à définir'}
                                        </div>
                                    )}
                                </div>

                                <div className="mx-auto max-w-sm rounded-xl bg-white/95 p-6 text-stone-800 shadow-2xl">
                                    <p
                                        className="font-display text-xl"
                                        style={{
                                            color: form.accent_color,
                                        }}
                                    >
                                        {form.greeting.replace(
                                            '{guest}',
                                            'Mado M.',
                                        )}
                                    </p>
                                    <p className="mt-4 text-sm leading-6 text-stone-600">
                                        {form.body}
                                    </p>
                                    <p className="mt-5 text-xs font-bold tracking-wider text-stone-400 uppercase">
                                        {form.rsvp_question}
                                    </p>
                                    <div className="mt-4 grid gap-2">
                                        <button
                                            className="rounded-md px-4 py-3 text-sm font-semibold text-white"
                                            style={{
                                                backgroundColor:
                                                    form.accent_color,
                                            }}
                                        >
                                            {form.accept_label}
                                        </button>
                                        <button className="rounded-md border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600">
                                            {form.decline_label}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs tracking-[0.28em] text-white/75 uppercase">
                                    {form.footer}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Palette className="h-3.5 w-3.5" />
                        L’aperçu utilise les réglages publics de cet événement.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone = 'default',
}: {
    icon: typeof Users;
    label: string;
    value: number;
    tone?: 'default' | 'emerald' | 'amber' | 'rose';
}) {
    const tones = {
        default: 'bg-primary/10 text-primary',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
    };

    return (
        <Card className="flex items-center gap-4 p-4">
            <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
        </Card>
    );
}
