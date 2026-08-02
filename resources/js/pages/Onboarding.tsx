import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CakeSlice,
    CalendarDays,
    CalendarCheck2,
    CalendarPlus,
    CalendarRange,
    Check,
    CheckCircle2,
    Flower2,
    Heart,
    MapPin,
    Music2,
    PartyPopper,
    Presentation,
    ReceiptText,
    CirclePlus,
    Clock3,
    Lightbulb,
    LoaderCircle,
    Rocket,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Module = {
    slug: string;
    name: string;
    description: string;
    required: boolean;
    recommendation: 'required' | 'recommended' | 'optional';
    dependencies: string[];
};

type EventType = {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    primary_color: string;
    category: string;
    modules: Module[];
};

type ExistingEvent = {
    id: string;
    name: string;
    slug: string;
    status: string;
    starts_at: string | null;
    type: string;
    modules_count: number;
};

type Organization = {
    id: string;
    name: string;
    slug: string;
    type: string;
    events: ExistingEvent[];
};

type Props = {
    organizations: Organization[];
    eventTypes: EventType[];
    defaults: {
        timezone: string;
        country_code: string;
        currency: string;
    };
};

type PricingPreview = {
    plan: {
        slug: string;
        name: string;
        description: string;
    };
    currency: string;
    subtotal_minor: number;
    total_minor: number;
    signature: string;
    metrics: {
        estimated_guests: number;
        enabled_modules: number;
    };
    lines: Array<{
        key: string;
        label: string;
        quantity: number;
        unit?: string;
        unit_amount_minor: number;
        amount_minor: number;
    }>;
};

type EventCopy = {
    detailsTitle: string;
    eventNameLabel: string;
    eventNamePlaceholder: string;
    attendeesLabel: string;
    attendeesPlaceholder: string;
    venueLabel: string;
    venuePlaceholder: string;
    addressPlaceholder: string;
    cityPlaceholder: string;
    modulesDescription: string;
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

const eventCopies: Record<string, EventCopy> = {
    wedding: {
        detailsTitle: 'Parlons de votre mariage',
        eventNameLabel: 'Nom du mariage',
        eventNamePlaceholder: 'Ex. Mariage d’Elikia & Merveille',
        attendeesLabel: 'Invités estimés',
        attendeesPlaceholder: 'Ex. 180',
        venueLabel: 'Lieu de réception',
        venuePlaceholder: 'Ex. Domaine des Acacias',
        addressPlaceholder: 'Ex. 24, avenue des Orangers',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Nous avons présélectionné les outils les plus utiles pour préparer un mariage sereinement.',
    },
    birthday: {
        detailsTitle: 'Préparons cet anniversaire',
        eventNameLabel: 'Nom de l’anniversaire',
        eventNamePlaceholder: 'Ex. Les 30 ans de Sarah',
        attendeesLabel: 'Invités estimés',
        attendeesPlaceholder: 'Ex. 60',
        venueLabel: 'Lieu de la fête',
        venuePlaceholder: 'Ex. Villa Nova',
        addressPlaceholder: 'Ex. 8, avenue des Fêtes',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Invitations, invités, programme et souvenirs : choisissez ce qui rendra la fête plus simple à organiser.',
    },
    'private-party': {
        detailsTitle: 'Dessinons votre soirée privée',
        eventNameLabel: 'Nom de la soirée',
        eventNamePlaceholder: 'Ex. Soirée blanche 2027',
        attendeesLabel: 'Invités estimés',
        attendeesPlaceholder: 'Ex. 120',
        venueLabel: 'Lieu de la soirée',
        venuePlaceholder: 'Ex. Rooftop Horizon',
        addressPlaceholder: 'Ex. 15, boulevard du Fleuve',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Contrôlez les invitations, l’accès et le déroulé grâce aux outils adaptés à une soirée privée.',
    },
    conference: {
        detailsTitle: 'Configurons votre conférence',
        eventNameLabel: 'Nom de la conférence',
        eventNamePlaceholder: 'Ex. Forum Tech Kinshasa 2027',
        attendeesLabel: 'Participants estimés',
        attendeesPlaceholder: 'Ex. 450',
        venueLabel: 'Centre ou salle de conférence',
        venuePlaceholder: 'Ex. Centre Horizon',
        addressPlaceholder: 'Ex. 12, avenue des Congrès',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Programme, billetterie, badges et intervenants : activez les outils utiles à votre conférence.',
    },
    'corporate-event': {
        detailsTitle: 'Structurons votre événement d’entreprise',
        eventNameLabel: 'Nom de l’événement',
        eventNamePlaceholder: 'Ex. Séminaire annuel Planivo',
        attendeesLabel: 'Collaborateurs ou participants',
        attendeesPlaceholder: 'Ex. 250',
        venueLabel: 'Lieu de l’événement',
        venuePlaceholder: 'Ex. Hôtel Fleuve Congo',
        addressPlaceholder: 'Ex. 119, boulevard Tshatshi',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Coordination d’équipe, programme, budget et documents : composez un espace adapté à votre organisation.',
    },
    concert: {
        detailsTitle: 'Mettons votre concert en scène',
        eventNameLabel: 'Nom du concert',
        eventNamePlaceholder: 'Ex. Kinshasa Live 2027',
        attendeesLabel: 'Spectateurs estimés',
        attendeesPlaceholder: 'Ex. 2 000',
        venueLabel: 'Salle ou scène',
        venuePlaceholder: 'Ex. Stade des Martyrs',
        addressPlaceholder: 'Ex. Boulevard Triomphal',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Billetterie, accès, équipes et programme : sélectionnez les outils nécessaires au bon déroulement du concert.',
    },
    memorial: {
        detailsTitle: 'Organisons cet hommage avec attention',
        eventNameLabel: 'Nom de la cérémonie',
        eventNamePlaceholder: 'Ex. Hommage à Jean Kabamba',
        attendeesLabel: 'Proches attendus',
        attendeesPlaceholder: 'Ex. 150',
        venueLabel: 'Lieu de la cérémonie',
        venuePlaceholder: 'Ex. Salle de recueillement La Paix',
        addressPlaceholder: 'Ex. 10, avenue de la Paix',
        cityPlaceholder: 'Ex. Kinshasa',
        modulesDescription:
            'Centralisez les informations, le programme et les communications avec sobriété et simplicité.',
    },
};

const defaultEventCopy = eventCopies.wedding;

const steps = [
    { label: 'Espace', number: 1 },
    { label: 'Type', number: 2 },
    { label: 'Détails', number: 3 },
    { label: 'Modules', number: 4 },
    { label: 'Prix', number: 5 },
];

const stepTips = [
    'Votre organisation regroupe vos événements et les personnes qui y travaillent.',
    'Le type choisi nous permet de vous proposer les outils les plus pertinents.',
    'Seuls le nom et la date sont indispensables. Le reste pourra être complété plus tard.',
    'Les modules recommandés sont précochés, mais vous gardez toujours le contrôle.',
    'Vous voyez le prix complet avant de créer quoi que ce soit.',
];

const money = (amountMinor: number, currency: string) =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(amountMinor / 100);

export default function Onboarding({
    organizations,
    eventTypes,
    defaults,
}: Props) {
    const { errors, auth } = usePage().props as any;
    const [showWelcome, setShowWelcome] = useState(organizations.length === 0);
    const [started, setStarted] = useState(organizations.length === 0);
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [pricing, setPricing] = useState<PricingPreview | null>(null);
    const [pricingLoading, setPricingLoading] = useState(false);
    const [pricingError, setPricingError] = useState('');
    const [form, setForm] = useState({
        organization_mode: organizations.length > 0 ? 'existing' : 'new',
        organization_id: organizations[0]?.id || '',
        organization_name: '',
        organization_type: 'personal',
        event_type_id: eventTypes[0]?.id || '',
        event_name: '',
        starts_at: '',
        timezone: defaults.timezone || 'Africa/Kinshasa',
        format: 'physical',
        venue_name: '',
        venue_address: '',
        city: '',
        country_code: defaults.country_code || 'CD',
        currency: defaults.currency || 'USD',
        estimated_guests: 100,
        modules:
            eventTypes[0]?.modules
                .filter(
                    (module) =>
                        module.required ||
                        module.recommendation === 'recommended',
                )
                .map((module) => module.slug) || ([] as string[]),
    });

    const activeType = useMemo(
        () =>
            eventTypes.find((type) => type.id === form.event_type_id) ||
            eventTypes[0],
        [eventTypes, form.event_type_id],
    );

    const activeCopy = activeType
        ? eventCopies[activeType.slug] || defaultEventCopy
        : defaultEventCopy;

    const selectedModules = form.modules;

    const goToStep = (nextStep: number) => {
        setDirection(nextStep > step ? 1 : -1);
        setStep(Math.max(1, Math.min(5, nextStep)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateType = (type: EventType) => {
        setPricing(null);
        setForm((current) => ({
            ...current,
            event_type_id: type.id,
            modules: type.modules
                .filter(
                    (module) =>
                        module.required ||
                        module.recommendation === 'recommended',
                )
                .map((module) => module.slug),
        }));
    };

    const toggleModule = (module: Module) => {
        if (module.required) {
            return;
        }

        setPricing(null);
        setForm((current) => {
            const currentModules = current.modules;

            return {
                ...current,
                modules: currentModules.includes(module.slug)
                    ? currentModules.filter((slug) => slug !== module.slug)
                    : [...currentModules, module.slug],
            };
        });
    };

    const canContinue = () => {
        if (step === 1) {
            return form.organization_mode === 'existing'
                ? Boolean(form.organization_id)
                : form.organization_name.trim().length >= 2;
        }

        if (step === 2) {
            return Boolean(form.event_type_id);
        }

        if (step === 3) {
            return Boolean(form.event_name.trim() && form.starts_at);
        }

        return true;
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (step !== 5 || !pricing) {
            return;
        }

        setProcessing(true);
        router.post(
            '/onboarding',
            {
                ...form,
                modules: selectedModules,
                pricing_signature: pricing.signature,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    };

    const requestPricing = async () => {
        setPricingLoading(true);
        setPricingError('');

        try {
            const response = await axios.post('/onboarding/quote', {
                event_type_id: form.event_type_id,
                estimated_guests: form.estimated_guests,
                modules: selectedModules,
            });
            setPricing(response.data.data);
            goToStep(5);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const validationErrors = error.response?.data?.errors;
                setPricingError(
                    validationErrors
                        ? Object.values(validationErrors).flat().join(' ')
                        : error.response?.data?.message ||
                              'Impossible de calculer le prix.',
                );
            } else {
                setPricingError('Impossible de calculer le prix.');
            }
        } finally {
            setPricingLoading(false);
        }
    };

    const openWorkspace = (
        organization: Organization,
        event: ExistingEvent,
    ) => {
        setProcessing(true);
        router.post(
            '/workspace/select',
            {
                organization_id: organization.id,
                event_id: event.id,
            },
            {
                onFinish: () => setProcessing(false),
            },
        );
    };

    if (showWelcome) {
        const firstName = auth?.user?.name?.split(' ')[0] || 'Bienvenue';

        return (
            <>
                <Head title="Bienvenue sur Planivo" />
                <main className="relative flex min-h-screen overflow-hidden bg-stone-950 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(190,137,58,0.28),transparent_28%),radial-gradient(circle_at_85%_75%,rgba(146,91,59,0.22),transparent_32%)]" />
                    <motion.div
                        className="absolute top-20 -right-24 h-80 w-80 rounded-full border border-white/10"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 36,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    />
                    <motion.div
                        className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-[#d5a253]/20"
                        animate={{ rotate: -360 }}
                        transition={{
                            duration: 28,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    />

                    <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:px-12 lg:py-12">
                        <motion.section
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                            <BrandLogo
                                variant="full"
                                className="h-16 w-40 rounded-xl bg-white/95 px-2"
                            />
                            <div className="mt-14 inline-flex items-center gap-2 rounded-full border border-[#d5a253]/20 bg-[#d5a253]/10 px-4 py-2 text-sm text-[#e8c68e]">
                                <Rocket className="h-4 w-4" />
                                Votre espace est prêt à prendre vie
                            </div>
                            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.08] font-semibold sm:text-6xl">
                                Bienvenue {firstName}, créons votre premier
                                événement.
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
                                Répondez à quelques questions simples. Planivo
                                préparera ensuite un espace parfaitement adapté
                                à votre projet.
                            </p>
                            <div className="mt-9 flex flex-wrap items-center gap-4">
                                <Button
                                    type="button"
                                    size="lg"
                                    className="h-13 rounded-xl bg-[#c48b3d] px-7 text-white shadow-xl shadow-[#c48b3d]/15 hover:bg-[#b17b34]"
                                    onClick={() => setShowWelcome(false)}
                                >
                                    Commencer la configuration
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <span className="flex items-center gap-2 text-sm text-white/45">
                                    <Clock3 className="h-4 w-4" /> Environ 3
                                    minutes
                                </span>
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, x: 40, rotate: 1 }}
                            animate={{ opacity: 1, x: 0, rotate: 0 }}
                            transition={{
                                delay: 0.2,
                                duration: 0.7,
                                ease: 'easeOut',
                            }}
                            className="relative"
                        >
                            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold tracking-[0.2em] text-[#d5a253] uppercase">
                                            Votre parcours
                                        </p>
                                        <h2 className="mt-2 font-display text-2xl font-semibold">
                                            Simple, guidé, personnalisable
                                        </h2>
                                    </div>
                                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d5a253]/15 text-[#e1b873]">
                                        <CalendarCheck2 className="h-6 w-6" />
                                    </span>
                                </div>
                                <div className="mt-8 space-y-3">
                                    {steps.map((item, index) => (
                                        <motion.div
                                            key={item.number}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.35 + index * 0.08,
                                            }}
                                            className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/10 p-4"
                                        >
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-[#e4bd7c]">
                                                {item.number}
                                            </span>
                                            <div>
                                                <p className="font-medium">
                                                    {item.label}
                                                </p>
                                                <p className="mt-0.5 text-xs text-white/40">
                                                    {
                                                        [
                                                            'Votre espace de travail',
                                                            'Une expérience sur mesure',
                                                            'Les repères essentiels',
                                                            'Les bons outils',
                                                            'Une validation transparente',
                                                        ][index]
                                                    }
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.section>
                    </div>
                </main>
            </>
        );
    }

    if (!started && organizations.length > 0) {
        return (
            <>
                <Head title="Choisir un espace" />
                <div className="min-h-screen bg-[#171512] text-white">
                    <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_right,rgba(190,137,58,0.24),transparent_48%),radial-gradient(circle_at_top_left,rgba(213,117,126,0.16),transparent_42%)]" />
                    <main className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
                        <header className="flex items-center justify-between gap-4">
                            <BrandLogo
                                variant="full"
                                className="h-16 w-40 rounded-xl bg-white/95 px-2"
                            />
                            <Button
                                variant="outline"
                                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                                onClick={() => setStarted(true)}
                            >
                                <CalendarPlus className="mr-2 h-4 w-4" />
                                Nouvel événement
                            </Button>
                        </header>

                        <section className="pt-16 pb-10 sm:pt-24">
                            <p className="text-xs font-semibold tracking-[0.28em] text-[#d2a55e] uppercase">
                                Votre espace Planivo
                            </p>
                            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-semibold sm:text-6xl">
                                Reprenez là où votre équipe s’est arrêtée.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
                                Ouvrez un événement existant ou configurez un
                                nouvel espace en quelques étapes.
                            </p>
                        </section>

                        <div className="grid gap-6">
                            {organizations.map((organization) => (
                                <section
                                    key={organization.id}
                                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur"
                                >
                                    <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
                                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#c79345]/15 text-[#e0b775]">
                                            <Building2 className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <h2 className="font-display text-xl font-semibold">
                                                {organization.name}
                                            </h2>
                                            <p className="text-sm text-white/45">
                                                {organization.events.length}{' '}
                                                événement
                                                {organization.events.length > 1
                                                    ? 's'
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {organization.events.map((event) => (
                                            <button
                                                key={event.id}
                                                type="button"
                                                disabled={processing}
                                                onClick={() =>
                                                    openWorkspace(
                                                        organization,
                                                        event,
                                                    )
                                                }
                                                className="group rounded-2xl border border-white/10 bg-black/15 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#d3a258]/50 hover:bg-white/[0.08]"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                                                        {event.type}
                                                    </span>
                                                    <ArrowRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#e0b775]" />
                                                </div>
                                                <h3 className="mt-5 font-display text-xl font-semibold">
                                                    {event.name}
                                                </h3>
                                                <div className="mt-4 flex items-center gap-4 text-xs text-white/45">
                                                    <span className="flex items-center gap-1.5">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        {event.starts_at
                                                            ? new Intl.DateTimeFormat(
                                                                  'fr-FR',
                                                                  {
                                                                      dateStyle:
                                                                          'medium',
                                                                  },
                                                              ).format(
                                                                  new Date(
                                                                      event.starts_at,
                                                                  ),
                                                              )
                                                            : 'Date à définir'}
                                                    </span>
                                                    <span>
                                                        {event.modules_count}{' '}
                                                        modules
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </main>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Configurer un événement" />
            <div className="min-h-screen bg-[#f7f3ec]">
                <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                        <BrandLogo variant="full" className="h-14 w-36" />
                        <div className="hidden items-center gap-3 text-sm text-stone-500 sm:flex">
                            <span className="font-medium text-stone-900">
                                Étape {step} sur {steps.length}
                            </span>
                            <span>•</span>
                            <span>
                                {Math.round((step / steps.length) * 100)} %
                            </span>
                        </div>
                        {organizations.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setStarted(false)}
                                className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Mes espaces
                            </button>
                        )}
                    </div>
                    <div className="h-1 bg-stone-100">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#9e6a2a] to-[#d7aa64]"
                            initial={false}
                            animate={{
                                width: `${(step / steps.length) * 100}%`,
                            }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                        />
                    </div>
                </header>

                <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-12">
                    <aside>
                        <div className="lg:sticky lg:top-8">
                            <p className="text-xs font-bold tracking-[0.2em] text-[#a7722e] uppercase">
                                Nouvel événement
                            </p>
                            <h1 className="mt-3 font-display text-3xl font-semibold text-stone-900">
                                Donnons vie à votre projet.
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-stone-500">
                                Planivo prépare uniquement les outils utiles à
                                votre événement.
                            </p>

                            <ol className="mt-8 grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-3">
                                {steps.map((item) => (
                                    <li
                                        key={item.number}
                                        aria-current={
                                            step === item.number
                                                ? 'step'
                                                : undefined
                                        }
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl p-2 transition lg:p-3',
                                            step === item.number &&
                                                'bg-white shadow-sm',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold',
                                                step > item.number
                                                    ? 'bg-emerald-600 text-white'
                                                    : step === item.number
                                                      ? 'bg-stone-900 text-white'
                                                      : 'bg-stone-200 text-stone-500',
                                            )}
                                        >
                                            {step > item.number ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                item.number
                                            )}
                                        </span>
                                        <span
                                            className={cn(
                                                'hidden text-sm font-medium lg:block',
                                                step === item.number
                                                    ? 'text-stone-900'
                                                    : 'text-stone-400',
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                    </li>
                                ))}
                            </ol>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.25 }}
                                    className="mt-7 hidden rounded-2xl border border-[#d8b77e]/30 bg-[#fff9ef] p-4 lg:block"
                                >
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#805722]">
                                        <Lightbulb className="h-4 w-4" />
                                        Conseil Planivo
                                    </div>
                                    <p className="mt-2 text-xs leading-5 text-stone-600">
                                        {stepTips[step - 1]}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </aside>

                    <form onSubmit={submit}>
                        <section className="min-h-[34rem] overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_24px_70px_rgba(48,38,24,0.08)] sm:p-8 lg:flex lg:h-[calc(100vh-10.5rem)] lg:min-h-[36rem] lg:flex-col lg:p-10">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={step}
                                    custom={direction}
                                    initial={{
                                        opacity: 0,
                                        x: direction > 0 ? 42 : -42,
                                    }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{
                                        opacity: 0,
                                        x: direction > 0 ? -32 : 32,
                                    }}
                                    transition={{
                                        duration: 0.32,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2"
                                >
                                    {step === 1 && (
                                        <div>
                                            <StepHeading
                                                eyebrow="Étape 1 sur 5"
                                                title="Dans quel espace travaillons-nous ?"
                                                description="Utilisez une organisation existante ou créez-en une pour votre équipe."
                                            />
                                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                                {organizations.length > 0 && (
                                                    <ChoiceCard
                                                        selected={
                                                            form.organization_mode ===
                                                            'existing'
                                                        }
                                                        icon={Building2}
                                                        title="Organisation existante"
                                                        description="Ajouter l’événement à un espace déjà configuré."
                                                        onClick={() =>
                                                            setForm(
                                                                (current) => ({
                                                                    ...current,
                                                                    organization_mode:
                                                                        'existing',
                                                                }),
                                                            )
                                                        }
                                                    />
                                                )}
                                                <ChoiceCard
                                                    selected={
                                                        form.organization_mode ===
                                                        'new'
                                                    }
                                                    icon={CirclePlus}
                                                    title="Nouvelle organisation"
                                                    description="Créer un espace indépendant et inviter une équipe plus tard."
                                                    onClick={() =>
                                                        setForm((current) => ({
                                                            ...current,
                                                            organization_mode:
                                                                'new',
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="mt-7 max-w-xl space-y-5">
                                                {form.organization_mode ===
                                                'existing' ? (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="organization_id">
                                                            Organisation
                                                        </Label>
                                                        <select
                                                            id="organization_id"
                                                            value={
                                                                form.organization_id
                                                            }
                                                            onChange={(event) =>
                                                                setForm({
                                                                    ...form,
                                                                    organization_id:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                })
                                                            }
                                                            className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                                        >
                                                            {organizations.map(
                                                                (
                                                                    organization,
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            organization.id
                                                                        }
                                                                        value={
                                                                            organization.id
                                                                        }
                                                                    >
                                                                        {
                                                                            organization.name
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="organization_name">
                                                                Nom de
                                                                l’organisation
                                                            </Label>
                                                            <Input
                                                                id="organization_name"
                                                                className="h-12"
                                                                placeholder="Ex. Agence Horizon, Famille Makengo…"
                                                                value={
                                                                    form.organization_name
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setForm({
                                                                        ...form,
                                                                        organization_name:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                }
                                                            />
                                                            <FieldError
                                                                message={
                                                                    errors?.organization_name
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="organization_type">
                                                                Type d’espace
                                                            </Label>
                                                            <select
                                                                id="organization_type"
                                                                value={
                                                                    form.organization_type
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setForm({
                                                                        ...form,
                                                                        organization_type:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                }
                                                                className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                                            >
                                                                <option value="personal">
                                                                    Personnel
                                                                </option>
                                                                <option value="business">
                                                                    Entreprise
                                                                </option>
                                                                <option value="agency">
                                                                    Agence
                                                                    événementielle
                                                                </option>
                                                                <option value="venue">
                                                                    Lieu de
                                                                    réception
                                                                </option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div>
                                            <StepHeading
                                                eyebrow="Étape 2 sur 5"
                                                title="Quel événement organisez-vous ?"
                                                description="Ce choix adapte les recommandations, les champs et les modules."
                                            />
                                            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                {eventTypes.map((type) => {
                                                    const Icon =
                                                        typeIcons[type.slug] ||
                                                        CalendarRange;
                                                    const selected =
                                                        activeType?.id ===
                                                        type.id;

                                                    return (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() =>
                                                                updateType(type)
                                                            }
                                                            className={cn(
                                                                'relative min-h-44 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5',
                                                                selected
                                                                    ? 'border-stone-900 bg-stone-900 text-white shadow-lg'
                                                                    : 'border-stone-200 bg-stone-50/70 text-stone-900 hover:border-stone-300 hover:bg-white',
                                                            )}
                                                        >
                                                            {selected && (
                                                                <span className="absolute top-4 right-4 grid h-6 w-6 place-items-center rounded-full bg-[#d5a253]">
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </span>
                                                            )}
                                                            <span
                                                                className="grid h-11 w-11 place-items-center rounded-xl"
                                                                style={{
                                                                    backgroundColor: `${type.primary_color}24`,
                                                                    color: type.primary_color,
                                                                }}
                                                            >
                                                                <Icon className="h-5 w-5" />
                                                            </span>
                                                            <p
                                                                className={cn(
                                                                    'mt-5 text-xs font-semibold tracking-wider uppercase',
                                                                    selected
                                                                        ? 'text-white/50'
                                                                        : 'text-stone-400',
                                                                )}
                                                            >
                                                                {type.category}
                                                            </p>
                                                            <h3 className="mt-1 font-display text-xl font-semibold">
                                                                {type.name}
                                                            </h3>
                                                            <p
                                                                className={cn(
                                                                    'mt-2 text-sm leading-5',
                                                                    selected
                                                                        ? 'text-white/60'
                                                                        : 'text-stone-500',
                                                                )}
                                                            >
                                                                {
                                                                    type.description
                                                                }
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div>
                                            <StepHeading
                                                eyebrow="Étape 3 sur 5"
                                                title={activeCopy.detailsTitle}
                                                description={`Donnez-nous les premiers repères de votre ${activeType?.name.toLowerCase() || 'événement'}. Vous pourrez compléter ces informations plus tard.`}
                                            />
                                            <div className="mt-8 grid gap-6 sm:grid-cols-2">
                                                <div className="space-y-2 sm:col-span-2">
                                                    <Label htmlFor="event_name">
                                                        {
                                                            activeCopy.eventNameLabel
                                                        }
                                                    </Label>
                                                    <Input
                                                        id="event_name"
                                                        className="h-12 text-base"
                                                        placeholder={
                                                            activeCopy.eventNamePlaceholder
                                                        }
                                                        value={form.event_name}
                                                        onChange={(event) =>
                                                            setForm({
                                                                ...form,
                                                                event_name:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            errors?.event_name
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="starts_at">
                                                        Date
                                                    </Label>
                                                    <Input
                                                        id="starts_at"
                                                        type="date"
                                                        className="h-12"
                                                        value={form.starts_at}
                                                        onChange={(event) =>
                                                            setForm({
                                                                ...form,
                                                                starts_at:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <FieldError
                                                        message={
                                                            errors?.starts_at
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="estimated_guests">
                                                        {
                                                            activeCopy.attendeesLabel
                                                        }
                                                    </Label>
                                                    <div className="relative">
                                                        <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                                        <Input
                                                            id="estimated_guests"
                                                            type="number"
                                                            min={0}
                                                            placeholder={
                                                                activeCopy.attendeesPlaceholder
                                                            }
                                                            className="h-12 pl-10"
                                                            value={
                                                                form.estimated_guests
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setPricing(
                                                                    null,
                                                                );
                                                                setForm({
                                                                    ...form,
                                                                    estimated_guests:
                                                                        Number(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="format">
                                                        Format
                                                    </Label>
                                                    <select
                                                        id="format"
                                                        value={form.format}
                                                        onChange={(event) =>
                                                            setForm({
                                                                ...form,
                                                                format: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        className="h-12 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                                    >
                                                        <option value="physical">
                                                            En présentiel
                                                        </option>
                                                        <option value="hybrid">
                                                            Hybride
                                                        </option>
                                                        <option value="virtual">
                                                            En ligne
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="venue_name">
                                                        {activeCopy.venueLabel}
                                                    </Label>
                                                    <div className="relative">
                                                        <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                                        <Input
                                                            id="venue_name"
                                                            className="h-12 pl-10"
                                                            placeholder={
                                                                activeCopy.venuePlaceholder
                                                            }
                                                            value={
                                                                form.venue_name
                                                            }
                                                            onChange={(event) =>
                                                                setForm({
                                                                    ...form,
                                                                    venue_name:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="city">
                                                        Ville
                                                    </Label>
                                                    <Input
                                                        id="city"
                                                        className="h-12"
                                                        placeholder={
                                                            activeCopy.cityPlaceholder
                                                        }
                                                        value={form.city}
                                                        onChange={(event) =>
                                                            setForm({
                                                                ...form,
                                                                city: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="venue_address">
                                                        Adresse
                                                    </Label>
                                                    <Input
                                                        id="venue_address"
                                                        className="h-12"
                                                        placeholder={
                                                            activeCopy.addressPlaceholder
                                                        }
                                                        value={
                                                            form.venue_address
                                                        }
                                                        onChange={(event) =>
                                                            setForm({
                                                                ...form,
                                                                venue_address:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 4 && activeType && (
                                        <div>
                                            <StepHeading
                                                eyebrow="Étape 4 sur 5"
                                                title={`Les bons outils pour votre ${activeType.name.toLowerCase()}`}
                                                description={
                                                    activeCopy.modulesDescription
                                                }
                                            />
                                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                                {activeType.modules
                                                    .filter(
                                                        (module) =>
                                                            module.required ||
                                                            module.recommendation ===
                                                                'recommended' ||
                                                            [
                                                                'tasks',
                                                                'budget',
                                                                'staff',
                                                                'vendors',
                                                                'documents',
                                                                'media',
                                                                'forms',
                                                                'analytics',
                                                            ].includes(
                                                                module.slug,
                                                            ),
                                                    )
                                                    .map((module) => {
                                                        const checked =
                                                            selectedModules.includes(
                                                                module.slug,
                                                            );

                                                        return (
                                                            <button
                                                                key={
                                                                    module.slug
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleModule(
                                                                        module,
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'flex min-h-24 items-start gap-4 rounded-2xl border p-4 text-left transition',
                                                                    checked
                                                                        ? 'border-[#c38b3d] bg-[#fff9ef]'
                                                                        : 'border-stone-200 bg-white hover:border-stone-300',
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border',
                                                                        checked
                                                                            ? 'border-[#b87d2f] bg-[#b87d2f] text-white'
                                                                            : 'border-stone-300',
                                                                    )}
                                                                >
                                                                    {checked && (
                                                                        <Check className="h-4 w-4" />
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    <span className="flex flex-wrap items-center gap-2">
                                                                        <span className="font-semibold text-stone-900">
                                                                            {
                                                                                module.name
                                                                            }
                                                                        </span>
                                                                        {module.required && (
                                                                            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                                                                                Essentiel
                                                                            </span>
                                                                        )}
                                                                        {!module.required &&
                                                                            module.recommendation ===
                                                                                'recommended' && (
                                                                                <span className="rounded-full bg-[#e8d2ad] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#77501f] uppercase">
                                                                                    Recommandé
                                                                                </span>
                                                                            )}
                                                                    </span>
                                                                    <span className="mt-1 block text-sm leading-5 text-stone-500">
                                                                        {
                                                                            module.description
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                            </div>

                                            <div className="mt-8 rounded-2xl bg-stone-900 p-5 text-white sm:flex sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-6 w-6 text-[#d5a253]" />
                                                    <div>
                                                        <p className="font-semibold">
                                                            {
                                                                selectedModules.length
                                                            }{' '}
                                                            modules sélectionnés
                                                        </p>
                                                        <p className="text-sm text-white/50">
                                                            Vous pourrez les
                                                            modifier plus tard.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 text-sm text-white/60 sm:mt-0 sm:text-right">
                                                    <p className="font-medium text-white">
                                                        {form.event_name}
                                                    </p>
                                                    <p>
                                                        {form.starts_at &&
                                                            new Intl.DateTimeFormat(
                                                                'fr-FR',
                                                                {
                                                                    dateStyle:
                                                                        'long',
                                                                },
                                                            ).format(
                                                                new Date(
                                                                    `${form.starts_at}T12:00:00`,
                                                                ),
                                                            )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 5 && pricing && activeType && (
                                        <div>
                                            <StepHeading
                                                eyebrow="Étape 5 sur 5"
                                                title="Votre prix avant création"
                                                description="Vérifiez le détail du devis. Rien ne sera créé avant votre confirmation."
                                            />
                                            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                                                <div className="rounded-2xl border border-stone-200 p-5">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-xs font-bold tracking-wider text-[#a7722e] uppercase">
                                                                Offre
                                                                recommandée
                                                            </p>
                                                            <h3 className="mt-1 font-display text-2xl font-semibold text-stone-900">
                                                                {
                                                                    pricing.plan
                                                                        .name
                                                                }
                                                            </h3>
                                                            <p className="mt-1 text-sm text-stone-500">
                                                                {
                                                                    pricing.plan
                                                                        .description
                                                                }
                                                            </p>
                                                        </div>
                                                        <ReceiptText className="h-6 w-6 text-[#b67d32]" />
                                                    </div>
                                                    <div className="mt-6 space-y-3">
                                                        {pricing.lines.map(
                                                            (line) => (
                                                                <div
                                                                    key={
                                                                        line.key
                                                                    }
                                                                    className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3 text-sm last:border-0"
                                                                >
                                                                    <div>
                                                                        <p className="font-medium text-stone-800">
                                                                            {
                                                                                line.label
                                                                            }
                                                                        </p>
                                                                        {line.quantity >
                                                                            1 && (
                                                                            <p className="mt-0.5 text-xs text-stone-400">
                                                                                {
                                                                                    line.quantity
                                                                                }{' '}
                                                                                {line.unit ||
                                                                                    'unité(s)'}{' '}
                                                                                ×{' '}
                                                                                {money(
                                                                                    line.unit_amount_minor,
                                                                                    pricing.currency,
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-semibold text-stone-900">
                                                                        {money(
                                                                            line.amount_minor,
                                                                            pricing.currency,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-stone-900 p-5 text-white">
                                                    <p className="text-sm text-white/50">
                                                        Total estimé
                                                    </p>
                                                    <p className="mt-2 font-display text-4xl font-semibold">
                                                        {money(
                                                            pricing.total_minor,
                                                            pricing.currency,
                                                        )}
                                                    </p>
                                                    <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm text-white/65">
                                                        <p>
                                                            {
                                                                pricing.metrics
                                                                    .estimated_guests
                                                            }{' '}
                                                            invités estimés
                                                        </p>
                                                        <p>
                                                            {
                                                                pricing.metrics
                                                                    .enabled_modules
                                                            }{' '}
                                                            modules activés
                                                        </p>
                                                        <p>{activeType.name}</p>
                                                    </div>
                                                    <p className="mt-5 text-xs leading-5 text-white/45">
                                                        Le calcul est effectué
                                                        côté serveur à partir
                                                        des tarifs configurés
                                                        pour les invités et les
                                                        modules.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {Object.keys(errors || {}).length > 0 &&
                                step === 5 && (
                                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        Certaines informations doivent être
                                        corrigées. Revenez aux étapes
                                        précédentes pour vérifier les champs
                                        signalés.
                                    </div>
                                )}

                            <footer className="mt-8 flex shrink-0 items-center justify-between border-t border-stone-100 bg-white pt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={step === 1 || processing}
                                    onClick={() => goToStep(step - 1)}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Retour
                                </Button>
                                {step < 4 ? (
                                    <Button
                                        type="button"
                                        className="h-11 bg-stone-900 px-6 text-white hover:bg-stone-800"
                                        disabled={!canContinue()}
                                        onClick={() => goToStep(step + 1)}
                                    >
                                        Continuer
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : step === 4 ? (
                                    <div className="text-right">
                                        {pricingError && (
                                            <p className="mb-2 max-w-md text-sm text-red-600">
                                                {pricingError}
                                            </p>
                                        )}
                                        <Button
                                            type="button"
                                            className="h-11 bg-[#b67d32] px-6 text-white hover:bg-[#9f6b29]"
                                            disabled={pricingLoading}
                                            onClick={requestPricing}
                                        >
                                            {pricingLoading ? (
                                                <>
                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                    Préparation de votre offre…
                                                </>
                                            ) : (
                                                'Voir mon offre'
                                            )}
                                            {!pricingLoading && (
                                                <ReceiptText className="ml-2 h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="submit"
                                        className="h-11 bg-[#b67d32] px-6 text-white hover:bg-[#9f6b29]"
                                        disabled={processing}
                                    >
                                        {processing
                                            ? 'Création en cours…'
                                            : 'Confirmer et créer'}
                                        {!processing && (
                                            <CalendarCheck2 className="ml-2 h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </footer>
                        </section>
                    </form>
                </main>
            </div>
        </>
    );
}

function StepHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <header>
            <p className="text-xs font-bold tracking-[0.18em] text-[#a7722e] uppercase">
                {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">
                {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
                {description}
            </p>
        </header>
    );
}

function ChoiceCard({
    selected,
    icon: Icon,
    title,
    description,
    onClick,
}: {
    selected: boolean;
    icon: typeof Building2;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative min-h-36 rounded-2xl border p-5 text-left transition',
                selected
                    ? 'border-stone-900 bg-stone-900 text-white shadow-lg'
                    : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white',
            )}
        >
            <Icon
                className={cn(
                    'h-6 w-6',
                    selected ? 'text-[#dfb36d]' : 'text-[#a7722e]',
                )}
            />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p
                className={cn(
                    'mt-1 text-sm leading-5',
                    selected ? 'text-white/55' : 'text-stone-500',
                )}
            >
                {description}
            </p>
            {selected && (
                <span className="absolute top-4 right-4 grid h-6 w-6 place-items-center rounded-full bg-[#d5a253] text-white">
                    <Check className="h-3.5 w-3.5" />
                </span>
            )}
        </button>
    );
}

function FieldError({ message }: { message?: string }) {
    return message ? <p className="text-sm text-red-600">{message}</p> : null;
}
