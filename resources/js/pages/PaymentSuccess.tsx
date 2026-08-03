import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Clock3,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess({ reference }: { reference?: string }) {
    return (
        <>
            <Head title="Paiement transmis" />
            <main className="relative flex min-h-screen overflow-hidden bg-[#f7f3ec] px-4 py-6 text-stone-900 sm:px-6 sm:py-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(190,137,58,0.16),transparent_28%),radial-gradient(circle_at_90%_90%,rgba(5,150,105,0.10),transparent_32%)]" />
                <div className="pointer-events-none absolute top-[-8rem] right-[-7rem] h-80 w-80 rounded-full border border-[#c69a56]/20" />
                <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full border border-stone-300/60" />

                <div className="relative mx-auto flex w-full max-w-5xl flex-col">
                    <Link
                        href="/"
                        className="w-fit"
                        aria-label="Accueil Planivo"
                    >
                        <BrandLogo variant="full" className="h-14 w-auto" />
                    </Link>

                    <section className="my-auto grid overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(52,38,22,0.14)] backdrop-blur md:grid-cols-[0.72fr_1fr]">
                        <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-stone-950 p-10 text-white md:min-h-[34rem]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(213,162,83,0.35),transparent_35%),linear-gradient(145deg,transparent,rgba(5,150,105,0.28))]" />
                            <div className="absolute h-56 w-56 rounded-full border border-white/10" />
                            <div className="absolute h-40 w-40 rounded-full border border-[#d5a253]/30" />
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-950/50 shadow-[0_0_70px_rgba(16,185,129,0.2)]">
                                <BadgeCheck
                                    className="h-11 w-11 text-emerald-200"
                                    strokeWidth={1.6}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
                            <p className="text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">
                                Paiement transmis
                            </p>
                            <h1 className="mt-4 max-w-xl font-display text-3xl leading-tight font-semibold sm:text-4xl">
                                Merci, la confirmation est en cours
                            </h1>
                            <p className="mt-4 max-w-xl text-[15px] leading-7 text-stone-600">
                                Votre paiement a bien été transmis. Votre offre
                                sera activée automatiquement dès la confirmation
                                sécurisée de RDCARD.
                            </p>

                            {reference && (
                                <div className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
                                    <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
                                        Référence du paiement
                                    </p>
                                    <p className="mt-1.5 font-mono text-sm font-semibold break-all text-stone-800">
                                        {reference}
                                    </p>
                                </div>
                            )}

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                                    <p className="text-sm leading-6 text-emerald-950">
                                        Confirmation protégée et automatique.
                                    </p>
                                </div>
                                <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                                    <p className="text-sm leading-6 text-amber-950">
                                        L’activation peut prendre quelques
                                        secondes.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button
                                    asChild
                                    className="h-12 bg-stone-950 px-6 text-white hover:bg-stone-800"
                                >
                                    <Link href="/transactions">
                                        <ReceiptText className="mr-2 h-4 w-4" />
                                        Suivre mon paiement
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    asChild
                                    className="h-12 border-stone-300 px-6"
                                >
                                    <Link href="/workspace">Mon événement</Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <p className="mt-5 text-center text-xs text-stone-500">
                        Paiement sécurisé par RDCARD · Planivo ne conserve
                        aucune donnée bancaire
                    </p>
                </div>
            </main>
        </>
    );
}
