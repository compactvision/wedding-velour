import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarCheck2,
    Check,
    LockKeyhole,
    Mail,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
    const { errors } = usePage().props as any;
    const [form, setForm] = useState({
        email: '',
        password: '',
        remember: false,
    });
    const [processing, setProcessing] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        router.post('/login', form, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <Head title="Connexion" />
            <main className="grid min-h-screen bg-[#fbfaf7] lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
                <section className="relative hidden overflow-hidden bg-stone-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(185,130,53,0.34),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(185,130,53,0.18),transparent_35%)]" />
                    <Link
                        href="/"
                        className="relative w-fit"
                        aria-label="Retour à l’accueil"
                    >
                        <BrandLogo
                            variant="full"
                            className="h-20 w-48 brightness-0 invert"
                        />
                    </Link>

                    <div className="relative max-w-xl py-16">
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                            <CalendarCheck2 className="h-4 w-4" />
                            Heureux de vous revoir
                        </span>
                        <h1 className="mt-7 font-display text-5xl leading-tight font-semibold">
                            Reprenez votre organisation là où vous l’avez
                            laissée.
                        </h1>
                        <p className="mt-5 text-lg leading-8 text-stone-300">
                            Retrouvez votre espace, votre équipe et toutes les
                            informations utiles à votre événement.
                        </p>
                        <div className="mt-10 space-y-4 text-sm text-stone-200">
                            {[
                                'Votre progression centralisée',
                                'Votre équipe toujours synchronisée',
                                'Vos données accessibles en toute sécurité',
                            ].map((benefit) => (
                                <div
                                    key={benefit}
                                    className="flex items-center gap-3"
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
                                        <Check className="h-4 w-4" />
                                    </span>
                                    {benefit}
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="relative text-sm text-stone-500">
                        © 2026 Planivo. Chaque détail compte.
                    </p>
                </section>

                <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
                    <div className="w-full max-w-lg">
                        <div className="mb-9 flex items-center justify-between lg:hidden">
                            <Link href="/" aria-label="Retour à l’accueil">
                                <BrandLogo
                                    variant="full"
                                    className="h-16 w-40"
                                />
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
                            >
                                <ArrowLeft className="h-4 w-4" /> Accueil
                            </Link>
                        </div>

                        <div className="mb-8">
                            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                                Bon retour parmi nous
                            </h2>
                            <p className="mt-3 text-base leading-7 text-stone-600">
                                Connectez-vous pour retrouver votre espace
                                événementiel.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email">Adresse email</Label>
                                <div className="relative">
                                    <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        placeholder="vous@exemple.com"
                                        className="h-12 rounded-xl border-stone-300 bg-white pl-10"
                                        value={form.email}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                email: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                {errors?.email && (
                                    <p className="text-sm text-destructive">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <div className="relative">
                                    <LockKeyhole className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Votre mot de passe"
                                        className="h-12 rounded-xl border-stone-300 bg-white pl-10"
                                        value={form.password}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                password: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-stone-600">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-stone-300 accent-primary"
                                    checked={form.remember}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            remember: event.target.checked,
                                        })
                                    }
                                />
                                Rester connecté
                            </label>
                            <Button
                                className="h-12 w-full rounded-xl text-base shadow-lg shadow-primary/15"
                                disabled={processing}
                            >
                                {processing ? 'Connexion…' : 'Se connecter'}
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                Pas encore de compte ?{' '}
                                <Link
                                    href="/register"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Créer un compte
                                </Link>
                            </p>
                        </form>
                    </div>
                </section>
            </main>
        </>
    );
}
