import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    MapPin,
    Settings2,
    Layers3,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    event: {
        id: string;
        name: string;
        slug: string;
        status: string;
        starts_at: string | null;
        timezone: string;
        format: string;
        venue_name: string | null;
        city: string | null;
        estimated_guests: number;
        legacy_wedding_id: string | null;
        type: {
            name: string;
            category: string;
            color: string;
        };
        modules: Array<{
            slug: string;
            name: string;
            description: string;
        }>;
    };
};

const legacyModuleLinks: Record<string, string> = {
    guests: '/guests',
    invitations: '/custom-invitation',
    rsvps: '/guests',
    seating: '/tables',
    catering: '/menu-admin',
    schedule: '/timeline',
    budget: '/budget',
    stock: '/inventory',
    purchasing: '/inventory',
    staff: '/agents',
    vendors: '/vendors',
    contracts: '/vendors',
    documents: '/documents',
    media: '/photos',
    gallery: '/photos',
    ticketing: '/ticketing',
    badges: '/badges',
    notifications: '/notifications',
    analytics: '/manager',
};

const modulePermissions: Record<string, string> = {
    guests: 'guests.view',
    invitations: 'invitations.view',
    rsvps: 'guests.view',
    seating: 'seating.view',
    catering: 'catering.view',
    schedule: 'schedule.view',
    budget: 'budget.view',
    stock: 'stock.view',
    purchasing: 'stock.view',
    staff: 'team.view',
    vendors: 'vendors.view',
    contracts: 'vendors.view',
    documents: 'documents.view',
    media: 'media.view',
    gallery: 'media.view',
    ticketing: 'ticketing.view',
    qr_access: 'checkins.view',
    badges: 'badges.view',
    notifications: 'notifications.view',
    analytics: 'event.update',
};

export default function Workspace({ organization, event }: Props) {
    const workspace = (usePage().props as any).workspace;
    const permissions: string[] = workspace?.permissions || [];
    const can = (permission?: string) =>
        !permission ||
        permissions.includes('*') ||
        permissions.includes(permission);
    const visibleModules = event.modules.filter((module) =>
        can(modulePermissions[module.slug]),
    );
    const eventDate = event.starts_at ? new Date(event.starts_at) : null;

    return (
        <>
            <Head title={event.name} />
            <div className="space-y-7">
                <section className="relative overflow-hidden rounded-3xl bg-stone-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
                    <div
                        className="absolute -top-28 -right-24 h-80 w-80 rounded-full opacity-25 blur-3xl"
                        style={{
                            backgroundColor: event.type.color || '#c28a3d',
                        }}
                    />
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
                            <span>{event.type.category}</span>
                            <span className="h-1 w-1 rounded-full bg-white/30" />
                            <span>{event.type.name}</span>
                        </div>
                        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                            <div>
                                <h1 className="max-w-4xl font-display text-4xl leading-tight font-semibold sm:text-5xl">
                                    {event.name}
                                </h1>
                                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-[#d9ad68]" />
                                        {organization.name}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-[#d9ad68]" />
                                        {eventDate
                                            ? new Intl.DateTimeFormat('fr-FR', {
                                                  dateStyle: 'long',
                                              }).format(eventDate)
                                            : 'Date à définir'}
                                    </span>
                                    {(event.venue_name || event.city) && (
                                        <span className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-[#d9ad68]" />
                                            {[event.venue_name, event.city]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href="/onboarding">
                                    Changer d’espace
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        icon={Users}
                        label="Participants estimés"
                        value={event.estimated_guests.toLocaleString('fr-FR')}
                    />
                    <MetricCard
                        icon={Layers3}
                        label="Modules accessibles"
                        value={String(visibleModules.length)}
                    />
                    <MetricCard
                        icon={Clock3}
                        label="Fuseau horaire"
                        value={event.timezone}
                    />
                </div>

                <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
                                Espace configuré
                            </p>
                            <h2 className="mt-2 font-display text-3xl font-semibold">
                                Vos modules Planivo
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Chaque outil est isolé dans cet événement et
                                partagé uniquement avec son équipe.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Provisionnement terminé
                        </div>
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleModules.map((module) => {
                            const link = legacyModuleLinks[module.slug];
                            const content = (
                                <>
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                        <Settings2 className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-foreground">
                                            {module.name}
                                        </span>
                                        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                                            {module.description}
                                        </span>
                                    </span>
                                    {link && (
                                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                </>
                            );

                            return link ? (
                                <Link
                                    key={module.slug}
                                    href={link}
                                    className="flex min-h-24 items-start gap-3 rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div
                                    key={module.slug}
                                    className="flex min-h-24 items-start gap-3 rounded-2xl border border-border bg-background p-4"
                                >
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Users;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <p className="mt-1 truncate text-xl font-semibold text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}
