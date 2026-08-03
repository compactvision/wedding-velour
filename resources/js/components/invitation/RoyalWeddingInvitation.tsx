import {
    AnimatePresence,
    motion,
    useScroll,
    useTransform,
} from 'framer-motion';
import {
    Check,
    ChevronDown,
    Clock3,
    Download,
    Flower2,
    GlassWater,
    Heart,
    MapPin,
    Navigation,
    QrCode,
    Shirt,
    Users,
    X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ROYAL_BACKGROUND =
    '/assets/images/invitations/royal-wedding-garden-v1.png';

type MenuItem = {
    id: string;
    name: string;
    category?: string;
    emoji?: string;
    description?: string;
};

type TimelineItem = {
    id: string;
    time?: string;
    title: string;
    description?: string;
};

type RoyalWeddingInvitationProps = {
    guest: any;
    wedding: any;
    custom: any;
    timeline: TimelineItem[];
    announcements: any[];
    menuItems: MenuItem[];
    menuPreferences: string[];
    table: any;
    coGuests: any[];
    inviteToken: string;
    invitationUrl: string;
    formattedWeddingDate: string;
    invitationTitle: string;
    accentColor: string;
    partyLabel: string;
    hasCompanions: boolean;
    isAttending: boolean;
    isDeclined: boolean;
    envelopeOpened: boolean;
    showLetter: boolean;
    rsvpOpen: boolean;
    isSubmitting: boolean;
    savedSuccess: boolean;
    onOpenEnvelope: () => void;
    onRsvpOpenChange: (open: boolean) => void;
    onTogglePreference: (id: string) => void;
    onRespond: (status: string) => Promise<void>;
    onDownloadQr: () => void;
};

function deriveInitials(names: string, configured?: string) {
    if (configured?.trim()) {
        return configured.trim().slice(0, 5).toUpperCase();
    }

    const partners = names.split(/\s+(?:&|et)\s+/i).filter(Boolean);

    if (partners.length >= 2) {
        return `${partners[0].trim().charAt(0)}&${partners[1].trim().charAt(0)}`.toUpperCase();
    }

    return names
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();
}

const loadImage = (source: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
    });

function drawCenteredText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;

        if (context.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });

    if (line) {
        lines.push(line);
    }

    lines.forEach((content, index) =>
        context.fillText(content, x, y + index * lineHeight),
    );

    return y + lines.length * lineHeight;
}

export default function RoyalWeddingInvitation({
    guest,
    wedding,
    custom,
    timeline,
    announcements,
    menuItems,
    menuPreferences,
    table,
    coGuests,
    inviteToken,
    invitationUrl,
    formattedWeddingDate,
    invitationTitle,
    accentColor,
    partyLabel,
    hasCompanions,
    isAttending,
    isDeclined,
    envelopeOpened,
    showLetter,
    rsvpOpen,
    isSubmitting,
    savedSuccess,
    onOpenEnvelope,
    onRsvpOpenChange,
    onTogglePreference,
    onRespond,
    onDownloadQr,
}: RoyalWeddingInvitationProps) {
    const coupleNames = custom.couple_names?.trim() || invitationTitle;
    const initials = deriveInitials(coupleNames, custom.couple_initials);
    const heroImage = custom.background_image || ROYAL_BACKGROUND;
    const mapQuery = [wedding.venue, wedding.venue_address]
        .filter(Boolean)
        .join(', ');
    const drinkItems = menuItems.filter(
        (item) => !item.category || item.category === 'drink',
    );

    const downloadRoyalInvitation = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const context = canvas.getContext('2d');
        const qrSvg = document.querySelector('#guest-invitation-qr svg');

        if (!context || !qrSvg) {
            return;
        }

        context.fillStyle = '#f5ecdd';
        context.fillRect(0, 0, canvas.width, canvas.height);

        try {
            const background = await loadImage(heroImage);
            const scale = Math.max(
                canvas.width / background.width,
                1240 / background.height,
            );
            const width = background.width * scale;
            const height = background.height * scale;
            context.drawImage(
                background,
                (canvas.width - width) / 2,
                0,
                width,
                height,
            );
        } catch {
            const fallback = context.createLinearGradient(0, 0, 0, 1240);
            fallback.addColorStop(0, '#f8ead8');
            fallback.addColorStop(1, '#d8c1a4');
            context.fillStyle = fallback;
            context.fillRect(0, 0, canvas.width, 1240);
        }

        const imageShade = context.createLinearGradient(0, 0, 0, 1240);
        imageShade.addColorStop(0, 'rgba(255,248,235,.08)');
        imageShade.addColorStop(0.62, 'rgba(255,248,235,0)');
        imageShade.addColorStop(1, 'rgba(35,24,20,.42)');
        context.fillStyle = imageShade;
        context.fillRect(0, 0, canvas.width, 1240);

        context.textAlign = 'center';
        context.fillStyle = '#4b372d';
        context.font = 'italic 58px Georgia, serif';
        context.fillText('Wedding Day', 540, 150);
        context.font = '600 25px Arial, sans-serif';
        context.letterSpacing = '6px';
        context.fillText(formattedWeddingDate.toUpperCase(), 540, 205);
        context.letterSpacing = '0px';
        context.font = 'italic 92px Georgia, serif';
        drawCenteredText(context, coupleNames, 540, 340, 880, 104);

        context.fillStyle = '#fffaf0';
        context.beginPath();
        context.roundRect(55, 1120, 970, 740, 54);
        context.fill();
        context.strokeStyle = `${accentColor}70`;
        context.lineWidth = 3;
        context.stroke();

        context.fillStyle = accentColor;
        context.font = 'italic 42px Georgia, serif';
        context.fillText(`${guest.first_name} ${guest.last_name}`, 540, 1205);
        context.fillStyle = '#6d594d';
        context.font = '26px Arial, sans-serif';
        context.fillText(partyLabel, 540, 1250);
        context.font = '600 29px Arial, sans-serif';
        context.fillText(wedding.venue || '', 540, 1310);
        context.font = '23px Arial, sans-serif';
        context.fillText(wedding.venue_address || '', 540, 1350);

        if (table) {
            const tableLabel = /^table\b/i.test(table.name)
                ? table.name
                : `Table ${table.name}`;
            context.fillStyle = '#2f241f';
            context.font = 'italic 38px Georgia, serif';
            context.fillText(tableLabel, 330, 1435);
            context.fillStyle = '#79675c';
            context.font = '21px Arial, sans-serif';
            const seatedNames = coGuests
                .slice(0, 5)
                .map(
                    (person: any) => `${person.first_name} ${person.last_name}`,
                )
                .join(' · ');
            drawCenteredText(
                context,
                seatedNames || 'Votre placement est réservé',
                330,
                1475,
                490,
                30,
            );
        }

        const qrSource = `data:image/svg+xml;base64,${btoa(
            unescape(
                encodeURIComponent(
                    new XMLSerializer().serializeToString(qrSvg),
                ),
            ),
        )}`;
        const qrImage = await loadImage(qrSource);
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.roundRect(690, 1400, 255, 255, 28);
        context.fill();
        context.drawImage(qrImage, 707, 1417, 221, 221);

        context.fillStyle = '#9b887c';
        context.font = '18px monospace';
        context.fillText(`RÉF. ${inviteToken}`, 817, 1690);
        context.font = 'italic 25px Georgia, serif';
        context.fillStyle = '#6d594d';
        context.fillText(custom.footer, 540, 1800);

        canvas.toBlob((blob) => {
            if (!blob) {
                return;
            }

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `invitation-${guest.first_name}-${guest.last_name}.png`;
            link.href = objectUrl;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
        }, 'image/png');
    };

    const respond = async (status: string) => {
        await onRespond(status);

        if (status === 'confirmed') {
            window.setTimeout(() => void downloadRoyalInvitation(), 900);
        }
    };

    return (
        <div
            className="min-h-screen overflow-x-hidden bg-[#f3ede2] text-[#392c27]"
            style={{ '--royal-accent': accentColor } as CSSProperties}
        >
            <AnimatePresence>
                {!showLetter && (
                    <RoyalEnvelope
                        coupleNames={coupleNames}
                        initials={initials}
                        accentColor={accentColor}
                        opened={envelopeOpened}
                        onOpen={onOpenEnvelope}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {envelopeOpened && !showLetter && (
                    <motion.div
                        className="pointer-events-none fixed inset-0 z-[60] bg-white"
                        initial={{
                            opacity: 0,
                            clipPath: 'circle(0% at 50% 48%)',
                        }}
                        animate={{
                            opacity: [0, 0.96, 1],
                            clipPath: 'circle(110% at 50% 48%)',
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.72,
                            delay: 1.08,
                            ease: 'easeInOut',
                        }}
                    />
                )}
            </AnimatePresence>

            {showLetter && (
                <motion.main
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto w-full max-w-[620px] overflow-hidden bg-[#fffdf8] shadow-[0_0_80px_rgba(70,45,30,0.2)]"
                >
                    <RoyalHero
                        image={heroImage}
                        names={coupleNames}
                        date={formattedWeddingDate}
                        accentColor={accentColor}
                    />

                    <PaperDivider color="#fffdf8" overlap />

                    <InvitationMessage
                        guestName={`${guest.first_name} ${guest.last_name}`}
                        custom={custom}
                        partyLabel={partyLabel}
                        hasCompanions={hasCompanions}
                        accentColor={accentColor}
                    />

                    <PaperDivider color="#2b211e" />

                    <Countdown
                        target={wedding.date}
                        accentColor={accentColor}
                    />

                    {announcements.length > 0 && (
                        <section className="space-y-3 px-6 py-12">
                            {announcements.map((announcement) => (
                                <div
                                    key={announcement.id}
                                    className="rounded-3xl border border-[#d9c9b2] bg-[#faf5eb] p-5 text-center"
                                >
                                    <p className="font-display text-xl">
                                        {announcement.title}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-[#79685d]">
                                        {announcement.message}
                                    </p>
                                </div>
                            ))}
                        </section>
                    )}

                    {timeline.length > 0 && (
                        <>
                            <PaperDivider color="#f7f0e4" />
                            <RoyalTimeline
                                items={timeline}
                                accentColor={accentColor}
                            />
                        </>
                    )}

                    {mapQuery && (
                        <>
                            <PaperDivider color="#fffdf8" />
                            <LocationSection
                                venue={wedding.venue}
                                address={wedding.venue_address}
                                mapQuery={mapQuery}
                                accentColor={accentColor}
                            />
                        </>
                    )}

                    {custom.dress_code?.trim() && (
                        <>
                            <PaperDivider color="#eee3d2" />
                            <DressCode
                                text={custom.dress_code}
                                accentColor={accentColor}
                            />
                        </>
                    )}

                    {isAttending && table && (
                        <>
                            <PaperDivider color="#fffaf1" />
                            <SeatingSection
                                table={table}
                                coGuests={coGuests}
                                accentColor={accentColor}
                            />
                        </>
                    )}

                    <PaperDivider color="#211916" />

                    <RsvpSealSection
                        initials={initials}
                        status={
                            isAttending
                                ? 'confirmed'
                                : isDeclined
                                  ? 'declined'
                                  : 'pending'
                        }
                        accentColor={accentColor}
                        onClick={() => onRsvpOpenChange(true)}
                    />

                    {isAttending && (
                        <GuestPass
                            invitationUrl={invitationUrl}
                            inviteToken={inviteToken}
                            partyLabel={partyLabel}
                            hasCompanions={hasCompanions}
                            table={table}
                            coGuests={coGuests}
                            accentColor={accentColor}
                            onDownloadQr={onDownloadQr}
                            onDownloadInvitation={downloadRoyalInvitation}
                        />
                    )}

                    <footer className="bg-[#241b18] px-6 py-12 text-center text-[#eee3d1]">
                        <Flower2 className="mx-auto h-5 w-5 opacity-70" />
                        <p className="mt-4 text-xs tracking-[0.35em] uppercase opacity-70">
                            {custom.footer}
                        </p>
                    </footer>
                </motion.main>
            )}

            <RsvpDialog
                open={rsvpOpen}
                onOpenChange={onRsvpOpenChange}
                question={custom.rsvp_question}
                acceptLabel={custom.accept_label}
                declineLabel={custom.decline_label}
                drinkItems={drinkItems}
                preferences={menuPreferences}
                accentColor={accentColor}
                isSubmitting={isSubmitting}
                savedSuccess={savedSuccess}
                onTogglePreference={onTogglePreference}
                onRespond={respond}
            />
        </div>
    );
}

function PaperDivider({
    color,
    overlap = false,
}: {
    color: string;
    overlap?: boolean;
}) {
    return (
        <div
            className={cn(
                'relative z-20 h-11 w-full overflow-hidden',
                overlap && '-mt-11',
            )}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 620 48"
                preserveAspectRatio="none"
                className="h-full w-full"
            >
                <path
                    d="M0 17 C36 3 66 30 103 15 C142 0 176 30 214 14 C253 -2 288 29 327 14 C367 -1 402 30 442 15 C482 1 520 29 557 13 C582 3 602 8 620 17 V48 H0 Z"
                    fill={color}
                />
            </svg>
        </div>
    );
}

function SeatingSection({ table, coGuests, accentColor }: any) {
    const tableLabel = /^table\b/i.test(table.name)
        ? table.name
        : `Table ${table.name}`;

    return (
        <section className="bg-[#fffaf1] px-6 py-18 text-center">
            <Users className="mx-auto h-7 w-7" style={{ color: accentColor }} />
            <p className="mt-4 text-[10px] font-bold tracking-[0.35em] text-[#967c68] uppercase">
                Votre placement
            </p>
            <h2 className="mt-4 font-display text-4xl italic">{tableLabel}</h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#78675c]">
                Voici les invités avec qui vous partagerez ce beau moment.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
                {coGuests.map((person: any) => (
                    <div
                        key={person.id}
                        className="rounded-2xl border border-[#e2d5c3] bg-white px-3 py-4 shadow-sm"
                    >
                        <span
                            className="mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
                            style={{ backgroundColor: accentColor }}
                        >
                            {person.first_name?.charAt(0)}
                            {person.last_name?.charAt(0)}
                        </span>
                        <p className="mt-3 text-sm font-medium text-[#514139]">
                            {person.first_name} {person.last_name}
                        </p>
                    </div>
                ))}
                {coGuests.length === 0 && (
                    <p className="col-span-2 rounded-2xl border border-dashed border-[#d5c5af] px-4 py-6 text-sm text-[#8c786c]">
                        Les autres invités de cette table seront affichés dès
                        leur placement.
                    </p>
                )}
            </div>
        </section>
    );
}

function RoyalEnvelope({
    coupleNames,
    initials,
    accentColor,
    opened,
    onOpen,
}: {
    coupleNames: string;
    initials: string;
    accentColor: string;
    opened: boolean;
    onOpen: () => void;
}) {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#201816]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(201,169,119,0.2),transparent_44%),linear-gradient(135deg,#120e0d,#30231e)]" />
            <div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,transparent,transparent_18px,rgba(255,255,255,.04)_19px,transparent_20px)] opacity-20" />

            <motion.button
                type="button"
                onClick={onOpen}
                disabled={opened}
                aria-label="Ouvrir l’invitation"
                className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-[#e9dfcb] px-8 text-center outline-none [perspective:1400px] sm:min-h-[760px] sm:max-w-[480px]"
                initial={{ opacity: 0, y: 35 }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: opened ? 1.03 : 1,
                }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.5),transparent_35%,rgba(87,61,43,.08))]" />
                <div className="absolute inset-5 border border-[#a98e67]/45" />
                <div className="absolute inset-8 border border-[#a98e67]/20" />

                <motion.div
                    className="absolute inset-x-9 top-[28%] z-10 h-[52%] rounded-t-[8rem] border border-[#cbb99e] bg-[#fffaf0] px-8 pt-20 shadow-2xl"
                    initial={false}
                    animate={
                        opened
                            ? { y: -210, opacity: 1, scale: 1.04 }
                            : { y: 120, opacity: 0, scale: 0.92 }
                    }
                    transition={{
                        duration: 1.25,
                        delay: opened ? 0.48 : 0,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    <p className="text-[9px] tracking-[0.32em] text-[#9c846c] uppercase">
                        Wedding Day
                    </p>
                    <p className="mt-5 font-display text-4xl text-[#4b382e] italic">
                        {coupleNames}
                    </p>
                    <Flower2
                        className="mx-auto mt-7 h-6 w-6"
                        style={{ color: accentColor }}
                    />
                </motion.div>

                <motion.div
                    className="absolute top-0 left-0 z-30 h-1/2 w-full origin-top bg-[#f6eedf] shadow-xl [backface-visibility:hidden] [clip-path:polygon(0_0,100%_0,50%_100%)]"
                    initial={false}
                    animate={{ rotateX: opened ? -178 : 0 }}
                    transition={{
                        duration: 1.05,
                        ease: [0.65, 0, 0.35, 1],
                    }}
                />
                <motion.div
                    className="absolute bottom-0 left-0 z-20 h-[52%] w-full bg-[#ded0b7] [clip-path:polygon(0_100%,0_0,50%_70%,100%_0,100%_100%)]"
                    initial={false}
                    animate={
                        opened ? { y: 80, opacity: 0.55 } : { y: 0, opacity: 1 }
                    }
                    transition={{ duration: 1.3, delay: opened ? 0.45 : 0 }}
                />

                <motion.div
                    className="relative z-40 -mt-10"
                    animate={{ opacity: opened ? 0 : 1, y: opened ? -50 : 0 }}
                    transition={{ duration: 0.45 }}
                >
                    <p className="text-[10px] font-semibold tracking-[0.42em] text-[#846f53] uppercase">
                        Une invitation personnelle
                    </p>
                    <p className="mt-5 font-display text-3xl text-[#4c3b31] italic">
                        {coupleNames}
                    </p>
                </motion.div>

                <motion.div
                    className="relative z-50 mt-20"
                    animate={
                        opened
                            ? {
                                  scale: [1, 1.3, 0],
                                  rotate: [0, -8, 18],
                                  opacity: [1, 1, 0],
                              }
                            : { y: [0, -5, 0] }
                    }
                    transition={
                        opened
                            ? { duration: 0.75 }
                            : { duration: 2.6, repeat: Infinity }
                    }
                >
                    <WaxSeal
                        initials={initials}
                        color={accentColor}
                        size="large"
                    />
                </motion.div>

                <motion.div
                    className="relative z-40 mt-8"
                    animate={{ opacity: opened ? 0 : 1, y: opened ? 35 : 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <p className="text-xs font-semibold tracking-[0.28em] text-[#675348] uppercase">
                        Cliquez sur le sceau pour ouvrir
                    </p>
                    <p className="mt-3 text-xs text-[#8c786c] italic">
                        Une célébration royale vous attend
                    </p>
                </motion.div>
            </motion.button>
        </motion.div>
    );
}

function WaxSeal({
    initials,
    color,
    size = 'normal',
}: {
    initials: string;
    color: string;
    size?: 'normal' | 'large';
}) {
    return (
        <div
            className={cn(
                'relative grid place-items-center rounded-full text-[#fff8e9] shadow-[0_18px_35px_rgba(35,20,15,.35),inset_0_5px_8px_rgba(255,255,255,.25),inset_0_-6px_10px_rgba(30,10,5,.35)]',
                size === 'large' ? 'h-28 w-28' : 'h-24 w-24',
            )}
            style={{ backgroundColor: color }}
        >
            <span className="absolute inset-2 rounded-full border border-white/25" />
            <span className="absolute inset-3 rounded-full border-2 border-white/15" />
            <span className="font-display text-2xl italic drop-shadow">
                {initials}
            </span>
            {Array.from({ length: 10 }).map((_, index) => (
                <span
                    key={index}
                    className="absolute h-3 w-3 rounded-full opacity-35"
                    style={{
                        backgroundColor: color,
                        transform: `rotate(${index * 36}deg) translateY(-54px)`,
                    }}
                />
            ))}
        </div>
    );
}

function RoyalHero({
    image,
    names,
    date,
    accentColor,
}: {
    image: string;
    names: string;
    date: string;
    accentColor: string;
}) {
    return (
        <section className="relative min-h-[100svh] overflow-hidden">
            <motion.img
                src={image}
                alt="Décor floral royal du mariage"
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: 7, ease: 'easeOut' }}
            />
            <motion.div
                className="absolute inset-x-0 bottom-0 h-[38%] bg-white/10 backdrop-blur-[1px]"
                animate={{ opacity: [0.15, 0.35, 0.15], x: [-8, 8, -8] }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fff8ea]/15 via-transparent to-[#2b211b]/28" />
            {Array.from({ length: 13 }).map((_, index) => (
                <motion.span
                    key={index}
                    className="absolute top-[-8%] h-3 w-2 rounded-[80%_20%_70%_30%] bg-[#fff7ee]/85 shadow-sm"
                    style={{ left: `${5 + ((index * 23) % 90)}%` }}
                    animate={{
                        y: ['0vh', '115vh'],
                        x: [0, index % 2 ? 28 : -24, 5],
                        rotate: [0, 190, 420],
                    }}
                    transition={{
                        duration: 8 + (index % 5),
                        delay: index * 0.55,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />
            ))}

            <div className="relative z-10 flex min-h-[100svh] flex-col items-center px-6 pt-[15svh] pb-10 text-center">
                <p className="font-display text-3xl text-[#5b4437] italic">
                    Wedding Day
                </p>
                <p className="mt-3 text-xs font-semibold tracking-[0.32em] text-[#6f594c] uppercase">
                    {date}
                </p>
                <div
                    className="mt-5 flex items-center gap-3"
                    style={{ color: accentColor }}
                >
                    <span className="h-px w-14 bg-current opacity-55" />
                    <Heart className="h-4 w-4 fill-current" />
                    <span className="h-px w-14 bg-current opacity-55" />
                </div>
                <h1 className="mt-8 max-w-md font-display text-5xl leading-[1.05] text-[#443229] italic drop-shadow-[0_2px_10px_rgba(255,255,255,.8)] sm:text-6xl">
                    {names}
                </h1>
                <motion.div
                    className="mt-auto text-[#fffaf1] drop-shadow-md"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <p className="text-[10px] font-bold tracking-[0.35em] uppercase">
                        Scroll down
                    </p>
                    <ChevronDown className="mx-auto mt-2 h-6 w-6" />
                </motion.div>
            </div>
        </section>
    );
}

function InvitationMessage({
    guestName,
    custom,
    partyLabel,
    hasCompanions,
    accentColor,
}: any) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="relative px-7 py-20 text-center"
        >
            <Flower2
                className="mx-auto h-7 w-7"
                style={{ color: accentColor }}
            />
            <p className="mt-8 text-xs font-semibold tracking-[0.3em] text-[#9a7e68] uppercase">
                {custom.eyebrow}
            </p>
            <h2 className="mt-7 font-display text-3xl text-[#47372f] italic">
                {custom.greeting.replace('{guest}', guestName)}
            </h2>
            <p className="mx-auto mt-7 max-w-md font-display text-xl leading-9 text-[#6d5b51]">
                {custom.body}
            </p>
            {hasCompanions && (
                <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[#dfd0bd] bg-[#fbf7ef] px-5 py-2 text-xs text-[#78665b]">
                    <Users className="h-4 w-4" /> Invitation valable pour{' '}
                    {partyLabel}
                </p>
            )}
        </motion.section>
    );
}

function Countdown({
    target,
    accentColor,
}: {
    target?: string;
    accentColor: string;
}) {
    const targetTime = useMemo(
        () => (target ? new Date(target).getTime() : 0),
        [target],
    );
    const [remaining, setRemaining] = useState(() =>
        Math.max(0, targetTime - Date.now()),
    );

    useEffect(() => {
        const update = () => setRemaining(Math.max(0, targetTime - Date.now()));
        update();
        const timer = window.setInterval(update, 1000);

        return () => window.clearInterval(timer);
    }, [targetTime]);

    if (!target) {
        return null;
    }

    const seconds = Math.floor(remaining / 1000);
    const values = [
        [Math.floor(seconds / 86400), 'Jours'],
        [Math.floor((seconds % 86400) / 3600), 'Heures'],
        [Math.floor((seconds % 3600) / 60), 'Minutes'],
        [seconds % 60, 'Secondes'],
    ];

    return (
        <section className="bg-[#2b211e] px-5 py-16 text-center text-[#fff8eb]">
            <Clock3
                className="mx-auto h-6 w-6"
                style={{ color: accentColor }}
            />
            <p className="mt-4 font-display text-2xl italic">
                Le grand jour approche
            </p>
            <div className="mt-9 grid grid-cols-4 gap-2">
                {values.map(([value, label]) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-white/5 px-1 py-4"
                    >
                        <p className="font-display text-3xl">
                            {String(value).padStart(2, '0')}
                        </p>
                        <p className="mt-1 text-[8px] tracking-[0.15em] text-white/55 uppercase sm:text-[10px]">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function RoyalTimeline({
    items,
    accentColor,
}: {
    items: TimelineItem[];
    accentColor: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: container,
        offset: ['start 70%', 'end 45%'],
    });
    const flowerTop = useTransform(scrollYProgress, [0, 1], ['2%', '94%']);

    return (
        <section
            ref={container}
            className="relative overflow-hidden bg-[#f7f0e4] px-5 py-20"
        >
            <div className="text-center">
                <p className="text-[10px] font-bold tracking-[0.35em] text-[#9b806a] uppercase">
                    Notre journée
                </p>
                <h2 className="mt-4 font-display text-4xl italic">
                    Le programme
                </h2>
            </div>
            <div className="relative mx-auto mt-14 max-w-lg">
                <div className="absolute top-0 bottom-0 left-[89px] w-px bg-[#ccbda8]" />
                <motion.div
                    className="absolute left-[74px] z-10 grid h-8 w-8 place-items-center rounded-full border-4 border-[#f7f0e4] bg-white shadow-lg"
                    style={{ top: flowerTop, color: accentColor }}
                >
                    <Flower2 className="h-4 w-4" />
                </motion.div>
                <div className="space-y-12">
                    {items.map((item, index) => (
                        <motion.article
                            key={item.id}
                            initial={{ opacity: 0, x: 25 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ delay: Math.min(index * 0.08, 0.35) }}
                            className="grid grid-cols-[72px_36px_1fr] items-start gap-0"
                        >
                            <time
                                className="pt-1 text-right text-xs font-bold tracking-wider"
                                style={{ color: accentColor }}
                            >
                                {item.time?.substring(0, 5) || '—'}
                            </time>
                            <span className="mx-auto mt-1 h-3 w-3 rounded-full border-[3px] border-[#f7f0e4] bg-[#b9a58c] ring-1 ring-[#b9a58c]" />
                            <div className="pl-4">
                                <h3 className="font-display text-2xl italic">
                                    {item.title}
                                </h3>
                                {item.description && (
                                    <p className="mt-2 text-sm leading-6 text-[#76665c]">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function LocationSection({ venue, address, mapQuery, accentColor }: any) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

    return (
        <section className="px-5 py-20 text-center">
            <MapPin
                className="mx-auto h-7 w-7"
                style={{ color: accentColor }}
            />
            <p className="mt-4 text-[10px] font-bold tracking-[0.35em] text-[#9b806a] uppercase">
                Rendez-vous
            </p>
            <h2 className="mt-4 font-display text-4xl italic">Le lieu</h2>
            <p className="mt-7 font-display text-2xl">{venue}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#78675c]">
                {address}
            </p>
            <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#d9cbb8] bg-[#ede5d8] shadow-lg">
                <iframe
                    title={`Carte de ${venue}`}
                    src={embedUrl}
                    className="h-64 w-full border-0 grayscale-[20%]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
            <Button
                asChild
                variant="outline"
                className="mt-6 rounded-full border-[#bda990] bg-transparent"
            >
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <Navigation className="mr-2 h-4 w-4" /> Ouvrir l’itinéraire
                </a>
            </Button>
        </section>
    );
}

function DressCode({
    text,
    accentColor,
}: {
    text: string;
    accentColor: string;
}) {
    return (
        <section className="bg-[#eee3d2] px-7 py-16 text-center">
            <div
                className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fffaf1] shadow-sm"
                style={{ color: accentColor }}
            >
                <Shirt className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold tracking-[0.35em] text-[#947964] uppercase">
                Élégance souhaitée
            </p>
            <h2 className="mt-3 font-display text-3xl italic">Dress code</h2>
            <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-8 text-[#6c584d]">
                {text}
            </p>
        </section>
    );
}

function RsvpSealSection({ initials, status, accentColor, onClick }: any) {
    const confirmed = status === 'confirmed';
    const declined = status === 'declined';

    return (
        <section className="relative overflow-hidden bg-[#211916] px-7 py-20 text-center text-[#fff7e9]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.08),transparent_48%)]" />
            <div className="relative">
                <p className="text-[10px] font-bold tracking-[0.38em] text-white/50 uppercase">
                    Réponse souhaitée
                </p>
                <h2 className="mt-4 font-display text-4xl italic">
                    {confirmed
                        ? 'Votre présence est confirmée'
                        : declined
                          ? 'Merci pour votre réponse'
                          : 'Serez-vous des nôtres ?'}
                </h2>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/55">
                    {confirmed
                        ? 'Votre pass personnel est prêt juste en dessous.'
                        : 'Touchez le sceau pour répondre et préciser vos préférences de boissons.'}
                </p>
                <motion.button
                    type="button"
                    onClick={onClick}
                    className="mx-auto mt-10 block rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                >
                    <WaxSeal
                        initials={confirmed ? '✓' : initials}
                        color={accentColor}
                    />
                </motion.button>
                <p className="mt-6 text-[10px] font-semibold tracking-[0.28em] text-white/50 uppercase">
                    {confirmed
                        ? 'Modifier ma réponse'
                        : 'Cliquer pour confirmer'}
                </p>
            </div>
        </section>
    );
}

function RsvpDialog({
    open,
    onOpenChange,
    question,
    acceptLabel,
    declineLabel,
    drinkItems,
    preferences,
    accentColor,
    isSubmitting,
    savedSuccess,
    onTogglePreference,
    onRespond,
}: any) {
    const [step, setStep] = useState<'response' | 'preferences'>('response');

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setStep('response');
        }

        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[2rem] border-[#ddcfbb] bg-[#fffaf1] p-0 sm:max-w-lg">
                <div className="p-6 sm:p-8">
                    <DialogTitle className="text-center font-display text-3xl text-[#46362e] italic">
                        {step === 'response'
                            ? question
                            : 'Vos préférences de boissons'}
                    </DialogTitle>
                    <DialogDescription className="mt-3 text-center text-[#7d6a5e]">
                        {step === 'response'
                            ? 'Dites-nous simplement si vous serez des nôtres.'
                            : 'Une dernière attention pour préparer parfaitement votre accueil.'}
                    </DialogDescription>

                    {step === 'preferences' && drinkItems.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center gap-3">
                                <GlassWater
                                    className="h-5 w-5"
                                    style={{ color: accentColor }}
                                />
                                <p className="font-semibold text-[#514138]">
                                    Préférences de boissons
                                </p>
                            </div>
                            <p className="mt-1 text-xs text-[#8c796c]">
                                Choisissez jusqu’à cinq propositions.
                            </p>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {drinkItems.map((item: MenuItem) => {
                                    const selected = preferences.includes(
                                        item.id,
                                    );

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() =>
                                                onTogglePreference(item.id)
                                            }
                                            className={cn(
                                                'flex items-center gap-3 rounded-2xl border p-3 text-left transition',
                                                selected
                                                    ? 'border-transparent text-white shadow-md'
                                                    : 'border-[#ddd0bd] bg-white text-[#625148]',
                                            )}
                                            style={
                                                selected
                                                    ? {
                                                          backgroundColor:
                                                              accentColor,
                                                      }
                                                    : undefined
                                            }
                                        >
                                            <span className="text-xl">
                                                {item.emoji || '🥂'}
                                            </span>
                                            <span className="flex-1 text-sm font-medium">
                                                {item.name}
                                            </span>
                                            {selected && (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {savedSuccess && (
                        <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
                            Votre réponse a bien été enregistrée.
                        </p>
                    )}

                    <div className="mt-8 grid gap-3">
                        {step === 'response' ? (
                            <>
                                <Button
                                    disabled={isSubmitting}
                                    className="h-13 rounded-full text-white"
                                    style={{ backgroundColor: accentColor }}
                                    onClick={() => setStep('preferences')}
                                >
                                    <Heart className="mr-2 h-4 w-4 fill-current" />{' '}
                                    {acceptLabel}
                                </Button>
                                <Button
                                    disabled={isSubmitting}
                                    variant="ghost"
                                    className="h-12 rounded-full text-[#7b675b]"
                                    onClick={() => onRespond('declined')}
                                >
                                    <X className="mr-2 h-4 w-4" />{' '}
                                    {declineLabel}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    disabled={isSubmitting}
                                    className="h-13 rounded-full text-white"
                                    style={{ backgroundColor: accentColor }}
                                    onClick={() => onRespond('confirmed')}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Confirmer et télécharger mon invitation
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-11 rounded-full text-[#7b675b]"
                                    onClick={() => setStep('response')}
                                >
                                    Retour
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function GuestPass({
    invitationUrl,
    inviteToken,
    partyLabel,
    hasCompanions,
    table,
    coGuests,
    accentColor,
    onDownloadQr,
    onDownloadInvitation,
}: any) {
    return (
        <section className="px-6 py-20 text-center">
            <QrCode
                className="mx-auto h-7 w-7"
                style={{ color: accentColor }}
            />
            <h2 className="mt-4 font-display text-4xl italic">
                Votre invitation
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#78675c]">
                Présentez ce code personnel à l’accueil. Vous pouvez aussi
                télécharger la carte complète.
            </p>
            {hasCompanions && (
                <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#f3ebdf] px-4 py-2 text-xs">
                    <Users className="h-4 w-4" /> Pass valable pour {partyLabel}
                </p>
            )}
            {table && (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[#dfd1be] bg-[#fcf7ee] p-4">
                    <p className="text-[10px] tracking-[0.3em] text-[#9c816d] uppercase">
                        Votre table
                    </p>
                    <p className="mt-2 font-display text-2xl">{table.name}</p>
                    {coGuests.length > 0 && (
                        <p className="mt-2 text-xs text-[#806e63]">
                            Avec{' '}
                            {coGuests
                                .map((person: any) => person.first_name)
                                .join(', ')}
                        </p>
                    )}
                </div>
            )}
            <div
                id="guest-invitation-qr"
                className="mx-auto mt-8 w-fit rounded-3xl bg-white p-5 shadow-xl ring-1 ring-[#e5d9c8]"
            >
                <QRCodeSVG
                    value={invitationUrl}
                    size={220}
                    level="H"
                    includeMargin
                />
            </div>
            <p className="mt-5 font-mono text-[10px] tracking-[0.2em] text-[#9b887b]">
                RÉF. {inviteToken}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button
                    variant="outline"
                    className="rounded-full border-[#c7b399]"
                    onClick={onDownloadQr}
                >
                    <Download className="mr-2 h-4 w-4" /> Télécharger le QR
                </Button>
                <Button
                    className="rounded-full bg-[#2b211e] text-white hover:bg-[#493831]"
                    onClick={onDownloadInvitation}
                >
                    <Download className="mr-2 h-4 w-4" /> Télécharger la carte
                </Button>
            </div>
        </section>
    );
}
