import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BarChart3,
    CalendarDays,
    CalendarCheck2,
    Check,
    CreditCard,
    Users,
    LayoutDashboard,
    Menu,
    QrCode,
    ShieldCheck,
    WalletCards,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';

const features = [
    {
        icon: Users,
        title: 'Invités & RSVP',
        text: 'Invitations numériques, confirmations et préférences centralisées.',
    },
    {
        icon: CalendarDays,
        title: 'Programme',
        text: 'Planifiez chaque temps fort et coordonnez les responsables.',
    },
    {
        icon: WalletCards,
        title: 'Budget & achats',
        text: 'Suivez les dépenses, contrats, stocks et approvisionnements.',
    },
    {
        icon: QrCode,
        title: 'Billetterie & accès',
        text: 'Émettez des billets QR et fluidifiez le contrôle à l’entrée.',
    },
    {
        icon: BarChart3,
        title: 'Pilotage en temps réel',
        text: 'Visualisez l’avancement et prenez les bonnes décisions.',
    },
    {
        icon: ShieldCheck,
        title: 'Équipes sécurisées',
        text: 'Attribuez les rôles et protégez les données de chaque événement.',
    },
];

type PublicPlan = {
    slug: string;
    name: string;
    description: string | null;
    billing_model: string;
    currency: string;
    base_price_minor: number;
    limits: {
        max_guests?: number;
        max_users?: number;
        max_modules?: number;
        storage_gb?: number;
    };
};

const formatPrice = (plan: PublicPlan) => {
    if (plan.billing_model === 'enterprise') {
        return 'Sur devis';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: plan.currency || 'USD',
        maximumFractionDigits: plan.base_price_minor % 100 === 0 ? 0 : 2,
    }).format(plan.base_price_minor / 100);
};

const planFeatures = (plan: PublicPlan) => {
    if (plan.billing_model === 'enterprise') {
        return [
            'Événements multiples',
            'Limites personnalisées',
            'Accompagnement prioritaire',
        ];
    }

    const features = [];

    if (plan.limits.max_guests) {
        features.push(
            `Jusqu’à ${plan.limits.max_guests.toLocaleString('fr-FR')} invités`,
        );
    }

    if (plan.limits.max_users) {
        features.push(
            `${plan.limits.max_users.toLocaleString('fr-FR')} membres d’équipe`,
        );
    }

    if (plan.limits.max_modules) {
        features.push(
            `${plan.limits.max_modules.toLocaleString('fr-FR')} modules inclus`,
        );
    }

    if (plan.limits.storage_gb) {
        features.push(
            `${plan.limits.storage_gb.toLocaleString('fr-FR')} Go de stockage`,
        );
    }

    return features;
};

export default function Welcome({ plans }: { plans: PublicPlan[] }) {
    const { auth } = usePage().props as any;
    const [mobileOpen, setMobileOpen] = useState(false);
    const startHref = auth?.user ? '/workspace' : '/register';

    return (
        <>
            <Head>
                <title>
                    Planivo — Organisez chaque événement avec sérénité
                </title>
                <meta
                    name="description"
                    content="Planivo centralise invités, budget, prestataires, billetterie, équipes et opérations dans un espace événementiel unique."
                />
            </Head>
            <div className="min-h-screen bg-[#fbfaf7] text-stone-900">
                <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbfaf7]/90 backdrop-blur-xl">
                    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
                        <a href="#accueil" aria-label="Planivo, accueil">
                            <BrandLogo variant="full" className="h-16 w-44" />
                        </a>
                        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
                            <a
                                href="#fonctionnalites"
                                className="hover:text-primary"
                            >
                                Fonctionnalités
                            </a>
                            <a href="#pourquoi" className="hover:text-primary">
                                Pourquoi Planivo
                            </a>
                            <a href="#tarifs" className="hover:text-primary">
                                Tarifs
                            </a>
                        </nav>
                        <div className="hidden items-center gap-3 md:flex">
                            {!auth?.user && (
                                <Button variant="ghost" asChild>
                                    <Link href="/login">Se connecter</Link>
                                </Button>
                            )}
                            <Button asChild>
                                <Link href={startHref}>
                                    {auth?.user ? 'Mon espace' : 'Commencer'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <button
                            className="md:hidden"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Ouvrir le menu"
                        >
                            {mobileOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                    {mobileOpen && (
                        <div className="space-y-3 border-t p-5 md:hidden">
                            <a className="block" href="#fonctionnalites">
                                Fonctionnalités
                            </a>
                            <a className="block" href="#tarifs">
                                Tarifs
                            </a>
                            <Button className="w-full" asChild>
                                <Link href={startHref}>Commencer</Link>
                            </Button>
                        </div>
                    )}
                </header>

                <main>
                    <section id="accueil" className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(185,130,53,0.16),transparent_32%),radial-gradient(circle_at_15%_70%,rgba(108,78,55,0.10),transparent_28%)]" />
                        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
                            <div className="flex flex-col justify-center">
                                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900">
                                    <CalendarCheck2 className="h-4 w-4" /> Votre
                                    événement, parfaitement orchestré
                                </div>
                                <h1 className="max-w-3xl font-display text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                                    Tout votre événement.{' '}
                                    <span className="text-primary">
                                        Un seul espace.
                                    </span>
                                </h1>
                                <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
                                    Planivo réunit vos invités, équipes,
                                    prestataires, finances et opérations pour
                                    vous permettre d’avancer avec clarté — du
                                    premier choix au dernier invité.
                                </p>
                                <div className="mt-9 flex flex-wrap gap-3">
                                    <Button size="lg" asChild>
                                        <Link href={startHref}>
                                            Créer mon événement
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild>
                                        <a href="#fonctionnalites">
                                            Découvrir la plateforme
                                        </a>
                                    </Button>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-5 text-sm text-stone-500">
                                    {[
                                        'Configuration guidée',
                                        'Modules à la carte',
                                        'Données sécurisées',
                                    ].map((item) => (
                                        <span
                                            key={item}
                                            className="flex items-center gap-2"
                                        >
                                            <Check className="h-4 w-4 text-emerald-600" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-2xl shadow-stone-300/50">
                                    <div className="rounded-3xl bg-stone-950 p-6 text-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-stone-400">
                                                    ÉVÉNEMENT
                                                </div>
                                                <div className="mt-1 text-xl font-semibold">
                                                    Mariage de Sarah & David
                                                </div>
                                            </div>
                                            <BadgeCheck className="h-8 w-8 text-amber-400" />
                                        </div>
                                        <div className="mt-8 grid grid-cols-3 gap-3">
                                            {[
                                                ['Invités', '184'],
                                                ['Confirmés', '146'],
                                                ['Budget', '72%'],
                                            ].map(([label, value]) => (
                                                <div
                                                    key={label}
                                                    className="rounded-2xl bg-white/10 p-4"
                                                >
                                                    <div className="text-2xl font-bold">
                                                        {value}
                                                    </div>
                                                    <div className="mt-1 text-xs text-stone-300">
                                                        {label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-5 space-y-3">
                                            {[
                                                'Finaliser le plan de salle',
                                                'Valider le menu du traiteur',
                                                'Envoyer le rappel RSVP',
                                            ].map((item, index) => (
                                                <div
                                                    key={item}
                                                    className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
                                                >
                                                    <span
                                                        className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                    />
                                                    <span className="text-sm">
                                                        {item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 p-3 pt-4">
                                        <div className="rounded-2xl bg-amber-50 p-4">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                            <div className="mt-3 text-sm font-semibold">
                                                Dépenses maîtrisées
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Suivi en temps réel
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50 p-4">
                                            <LayoutDashboard className="h-5 w-5 text-emerald-700" />
                                            <div className="mt-3 text-sm font-semibold">
                                                Équipe alignée
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Rôles et accès
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="fonctionnalites" className="bg-white py-24">
                        <div className="mx-auto max-w-7xl px-5 lg:px-8">
                            <div className="mx-auto max-w-2xl text-center">
                                <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                                    Une plateforme complète
                                </p>
                                <h2 className="mt-3 font-display text-4xl font-semibold">
                                    Tout ce qu’il faut pour garder le contrôle
                                </h2>
                                <p className="mt-4 text-stone-600">
                                    Activez uniquement les modules utiles à
                                    votre événement.
                                </p>
                            </div>
                            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {features.map(({ icon: Icon, title, text }) => (
                                    <div
                                        key={title}
                                        className="rounded-3xl border border-stone-200 p-7 transition hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-primary">
                                            <Icon />
                                        </div>
                                        <h3 className="mt-5 text-lg font-semibold">
                                            {title}
                                        </h3>
                                        <p className="mt-2 leading-7 text-stone-600">
                                            {text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="pourquoi" className="py-24">
                        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
                            <div>
                                <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                                    Conçu pour avancer
                                </p>
                                <h2 className="mt-3 font-display text-4xl font-semibold">
                                    Moins de fichiers dispersés. Plus de
                                    décisions sereines.
                                </h2>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                {[
                                    ['01', 'Un parcours guidé'],
                                    ['02', 'Une vision partagée'],
                                    ['03', 'Des accès maîtrisés'],
                                    ['04', 'Des données actionnables'],
                                ].map(([number, label]) => (
                                    <div
                                        key={number}
                                        className="border-l-2 border-primary pl-5"
                                    >
                                        <div className="text-sm font-bold text-primary">
                                            {number}
                                        </div>
                                        <div className="mt-2 text-lg font-semibold">
                                            {label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="tarifs"
                        className="bg-stone-950 py-24 text-white"
                    >
                        <div className="mx-auto max-w-7xl px-5 lg:px-8">
                            <div className="text-center">
                                <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
                                    Tarification claire
                                </p>
                                <h2 className="mt-3 font-display text-4xl font-semibold">
                                    Un forfait adapté à votre ambition
                                </h2>
                            </div>
                            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.slug}
                                        className={`rounded-3xl p-7 ${plan.slug === 'standard' ? 'bg-primary ring-2 ring-amber-300' : 'bg-white/5 ring-1 ring-white/10'}`}
                                    >
                                        <div className="text-lg font-semibold">
                                            {plan.name}
                                        </div>
                                        <div className="mt-5 text-4xl font-bold">
                                            {formatPrice(plan)}
                                        </div>
                                        <p
                                            className={`mt-3 ${plan.slug === 'standard' ? 'text-amber-50' : 'text-stone-400'}`}
                                        >
                                            {plan.description ||
                                                'Une formule adaptée à votre événement.'}
                                        </p>
                                        <ul className="mt-7 space-y-3">
                                            {planFeatures(plan).map(
                                                (feature) => (
                                                    <li
                                                        key={feature}
                                                        className="flex gap-2 text-sm"
                                                    >
                                                        <Check className="h-5 w-5 shrink-0" />
                                                        {feature}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                        <Button
                                            className="mt-8 w-full"
                                            variant={
                                                plan.slug === 'standard'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                            asChild
                                        >
                                            <Link href={startHref}>
                                                Choisir {plan.name}
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="px-5 py-24">
                        <div className="mx-auto max-w-5xl rounded-[2rem] bg-primary px-6 py-14 text-center text-white sm:px-12">
                            <h2 className="font-display text-4xl font-semibold">
                                Votre prochain événement commence ici.
                            </h2>
                            <p className="mx-auto mt-4 max-w-xl text-amber-50">
                                Créez votre espace Planivo et construisez une
                                organisation qui vous ressemble.
                            </p>
                            <Button
                                size="lg"
                                variant="secondary"
                                className="mt-8"
                                asChild
                            >
                                <Link href={startHref}>
                                    Commencer maintenant
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </section>
                </main>
                <footer className="border-t border-stone-200">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-stone-500 sm:flex-row lg:px-8">
                        <BrandLogo variant="full" className="h-12 w-36" />
                        <span>© 2026 Planivo. Chaque détail compte.</span>
                        <div className="flex gap-5">
                            <a href="#fonctionnalites">Fonctionnalités</a>
                            <a href="#tarifs">Tarifs</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
