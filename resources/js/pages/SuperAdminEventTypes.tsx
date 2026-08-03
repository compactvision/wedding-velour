import { Head, router } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    CakeSlice,
    CalendarRange,
    Flower2,
    Heart,
    Music2,
    PartyPopper,
    Presentation,
} from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type EventType = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    primary_color: string | null;
    category: string | null;
    status: string;
    events_count: number;
    modules_count: number;
};

const typeIcons: Record<string, typeof Heart> = {
    wedding: Heart,
    birthday: CakeSlice,
    'private-party': PartyPopper,
    conference: Presentation,
    'corporate-event': BriefcaseBusiness,
    concert: Music2,
    memorial: Flower2,
};

export default function SuperAdminEventTypes({
    eventTypes,
}: {
    eventTypes: EventType[];
}) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const activeCount = eventTypes.filter(
        (eventType) => eventType.status === 'active',
    ).length;

    const toggle = (eventType: EventType, isActive: boolean) => {
        setProcessingId(eventType.id);
        router.post(
            `/superadmin/event-types/${eventType.id}/status`,
            { is_active: isActive },
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <>
            <Head title="Types d’événements" />

            <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                    <p className="text-xs font-bold tracking-[0.18em] text-amber-700 uppercase">
                        Catalogue de la plateforme
                    </p>
                    <h1 className="mt-2 font-display text-4xl font-semibold">
                        Types d’événements
                    </h1>
                    <p className="mt-2 max-w-2xl text-stone-500">
                        Choisissez les événements proposés aux organisateurs
                        lors de la création de leur espace.
                    </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3 shadow-sm">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                        <CalendarRange className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-2xl font-semibold">{activeCount}</p>
                        <p className="text-xs text-stone-500">
                            types actifs sur {eventTypes.length}
                        </p>
                    </div>
                </div>
            </header>

            <div className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
                Désactiver un type le retire immédiatement de l’onboarding. Les
                événements déjà créés avec ce type restent accessibles et ne
                sont pas modifiés.
            </div>

            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {eventTypes.map((eventType) => {
                    const Icon = typeIcons[eventType.slug] || CalendarRange;
                    const active = eventType.status === 'active';
                    const processing = processingId === eventType.id;

                    return (
                        <article
                            key={eventType.id}
                            className={cn(
                                'relative overflow-hidden rounded-3xl border bg-white p-6 shadow-sm transition',
                                active
                                    ? 'border-stone-200'
                                    : 'border-stone-200 bg-stone-50/80 opacity-75',
                            )}
                        >
                            <div
                                className="absolute inset-x-0 top-0 h-1"
                                style={{
                                    backgroundColor: active
                                        ? eventType.primary_color || '#b98235'
                                        : '#a8a29e',
                                }}
                            />
                            <div className="flex items-start justify-between gap-5">
                                <span
                                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                                    style={{
                                        color:
                                            eventType.primary_color ||
                                            '#8a5e25',
                                        backgroundColor: `${eventType.primary_color || '#b98235'}18`,
                                    }}
                                >
                                    <Icon className="h-6 w-6" />
                                </span>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            'text-xs font-semibold',
                                            active
                                                ? 'text-emerald-700'
                                                : 'text-stone-500',
                                        )}
                                    >
                                        {processing
                                            ? 'Mise à jour…'
                                            : active
                                              ? 'Actif'
                                              : 'Inactif'}
                                    </span>
                                    <Switch
                                        checked={active}
                                        disabled={processing}
                                        onCheckedChange={(checked) =>
                                            toggle(eventType, checked)
                                        }
                                        aria-label={`${active ? 'Désactiver' : 'Activer'} ${eventType.name}`}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            </div>

                            <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-stone-400 uppercase">
                                {eventType.category || 'Événement'}
                            </p>
                            <h2 className="mt-1 font-display text-2xl font-semibold">
                                {eventType.name}
                            </h2>
                            <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">
                                {eventType.description}
                            </p>

                            <div className="mt-6 flex gap-5 border-t border-stone-100 pt-4 text-xs text-stone-500">
                                <span>
                                    <strong className="text-stone-800">
                                        {eventType.events_count}
                                    </strong>{' '}
                                    événement
                                    {eventType.events_count > 1 ? 's' : ''}
                                </span>
                                <span>
                                    <strong className="text-stone-800">
                                        {eventType.modules_count}
                                    </strong>{' '}
                                    modules
                                </span>
                            </div>
                        </article>
                    );
                })}
            </section>
        </>
    );
}
