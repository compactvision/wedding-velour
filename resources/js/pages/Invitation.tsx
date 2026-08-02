import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Heart,
    MapPin,
    CalendarDays,
    Clock,
    GlassWater,
    Utensils,
    CheckCircle2,
    XCircle,
    Users,
    Check,
    Download,
    QrCode,
    Flower2,
    Leaf,
    Bell,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BrandLogo from '@/components/shared/BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
    starter: { label: 'Entrées', emoji: '🥗' },
    main: { label: 'Plats Principaux', emoji: '🍽️' },
    dessert: { label: 'Desserts', emoji: '🍰' },
    drink: { label: 'Boissons', emoji: '🥂' },
};

const MAX_PREFERENCES = 5;

const DEFAULT_INVITATION = {
    eyebrow: 'Vous êtes cordialement invité(e)',
    title: '',
    greeting: 'Cher(e) {guest}',
    body: 'Nous serions honorés de partager ce moment avec vous. Rejoignez-nous pour vivre ensemble cet événement.',
    rsvp_question: 'Serez-vous présent(e) ?',
    accept_label: 'Oui, je serai là !',
    decline_label: 'Désolé(e), je décline',
    footer: 'Merci et à très vite',
    background_image: '',
    accent_color: '#8B1E1E',
};

const Particle = ({
    delay,
    color,
    isStar,
}: {
    delay: number;
    color: string;
    isStar?: boolean;
}) => {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -50,
                x: Math.random() * 100 - 50,
                rotate: 0,
                scale: 0,
            }}
            animate={{
                opacity: [0, isStar ? 1 : 0.4, 0],
                y: [0, 500],
                x: [0, Math.random() * 200 - 100],
                rotate: [0, Math.random() * 360],
                scale: [0, Math.random() * 1.5 + 0.5, 0],
            }}
            transition={{
                duration: 8 + Math.random() * 7,
                repeat: Infinity,
                delay,
                ease: 'linear',
            }}
            className={cn(
                'pointer-events-none absolute top-0',
                isStar
                    ? 'h-1 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                    : 'h-4 w-3',
            )}
            style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: isStar ? '#fff' : color,
                borderTopRightRadius: '50%',
                borderBottomLeftRadius: '50%',
            }}
        />
    );
};

export default function Invitation() {
    const { url } = usePage();
    const searchParams = new URLSearchParams(url.split('?')[1] || '');
    const inviteToken = searchParams.get('invite');

    const [guest, setGuest] = useState(null);
    const [wedding, setWedding] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [table, setTable] = useState(null);
    const [coGuests, setCoGuests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Interaction states
    const [envelopeOpened, setEnvelopeOpened] = useState(false);
    const [showLetter, setShowLetter] = useState(false);

    // Form states
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [menuPreferences, setMenuPreferences] = useState<string[]>([]);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        async function load() {
            if (!inviteToken) {
                setLoading(false);
                return;
            }

            try {
                const invitation = await base44.public.invitation(inviteToken);
                const currentGuest = invitation.guest;
                setGuest(currentGuest);
                setMenuPreferences(currentGuest.menu_preferences || []);
                setWedding(invitation.wedding);
                setTimeline(invitation.timeline || []);
                setAnnouncements(invitation.announcements || []);
                setMenuItems(invitation.menu_items || []);
                setTable(invitation.table);
                setCoGuests(invitation.co_guests || []);
            } catch {
                setGuest(null);
            }
            setLoading(false);
        }
        load();
    }, [inviteToken]);

    const handleOpenEnvelope = () => {
        setEnvelopeOpened(true);
        setTimeout(() => setShowLetter(true), 1200);
    };

    const handleRSVP = async (status: string) => {
        setIsSubmitting(true);
        try {
            const updatedGuest = await base44.public.respondToInvitation(
                inviteToken,
                {
                    status,
                    menu_preferences: menuPreferences,
                },
            );
            setGuest({
                ...guest,
                ...updatedGuest,
                status,
                menu_preferences: menuPreferences,
            });
            setSavedSuccess(true);
            if (status === 'attending' || status === 'confirmed') {
                setTimeout(() => {
                    downloadInvitationCard();
                }, 650);
            }
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSavePreferences = async () => {
        if (!inviteToken || !guest) return;

        setIsSavingPreferences(true);
        try {
            const updatedGuest = await base44.public.respondToInvitation(
                inviteToken,
                {
                    status:
                        guest.status === 'declined'
                            ? 'confirmed'
                            : guest.status || 'confirmed',
                    menu_preferences: menuPreferences,
                },
            );
            setGuest({
                ...guest,
                ...updatedGuest,
                menu_preferences: menuPreferences,
            });
            setSavedSuccess(true);
            setIsMenuModalOpen(false);
            setTimeout(() => setSavedSuccess(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingPreferences(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    if (!guest || !wedding) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
                <Card className="w-full max-w-md rounded-3xl border-0 p-10 text-center shadow-2xl">
                    <BrandLogo
                        variant="mark"
                        className="mx-auto mb-6 h-28 w-28 opacity-70"
                    />
                    <h1 className="font-display text-2xl font-medium text-stone-800">
                        Invitation introuvable
                    </h1>
                    <p className="mt-3 text-stone-500">
                        Ce lien n'est pas valide ou a expiré.
                    </p>
                </Card>
            </div>
        );
    }

    const isAttending = ['attending', 'confirmed'].includes(guest.status);
    const isDeclined = guest.status === 'declined';
    const custom = {
        ...DEFAULT_INVITATION,
        ...(wedding.invitation_custom || {}),
    };
    const accentColor = custom.accent_color || DEFAULT_INVITATION.accent_color;
    const guestName = `${guest.first_name} ${guest.last_name}`;
    const companionCount = Number(guest.companions) || 0;
    const partySize = 1 + companionCount;
    const hasCompanions = companionCount > 0;
    const companionLine = hasCompanions
        ? `Votre invitation est prévue pour vous et ${companionCount} personne${companionCount > 1 ? 's' : ''} qui vous accompagne${companionCount > 1 ? 'nt' : ''}.`
        : '';
    const partyLabel = `${partySize} personne${partySize > 1 ? 's' : ''}`;
    const invitationTitle = custom.title || wedding.title;
    const formattedWeddingDate = wedding.date
        ? format(new Date(wedding.date), 'EEEE d MMMM yyyy', { locale: fr })
        : '';
    const greetingParts = custom.greeting.includes('{guest}')
        ? custom.greeting.split('{guest}')
        : [custom.greeting ? `${custom.greeting} ` : '', ''];
    const selectedPreferredItems = menuPreferences
        .map((id) => menuItems.find((item) => item.id === id))
        .filter(Boolean);

    const toggleMenuPreference = (itemId: string) => {
        setMenuPreferences((prev) => {
            if (prev.includes(itemId)) {
                return prev.filter((id) => id !== itemId);
            }
            if (prev.length >= 5) {
                return prev;
            }
            return [...prev, itemId];
        });
    };

    const invitationUrl = `${window.location.origin}/invitation?invite=${inviteToken}`;
    const drawWrappedText = (
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
    ) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        words.forEach((word) => {
            const testLine = `${line}${word} `;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line.trim(), x, currentY);
                line = `${word} `;
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
    };

    const loadCanvasImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = src;
        });

    const downloadGuestQr = () => {
        const svg = document.querySelector('#guest-invitation-qr svg');
        if (!svg) return;
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 820;
        const context = canvas.getContext('2d');
        const image = new Image();
        const svgData = new XMLSerializer().serializeToString(svg);

        image.onload = () => {
            if (!context) return;
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#1c1917';
            context.textAlign = 'center';
            context.font = '600 30px serif';
            context.fillText(invitationTitle, canvas.width / 2, 55);
            context.font = '500 24px sans-serif';
            context.fillText(
                `${guest.first_name} ${guest.last_name}`,
                canvas.width / 2,
                95,
            );
            if (hasCompanions) {
                context.font = '600 18px sans-serif';
                context.fillStyle = accentColor;
                context.fillText(
                    `Pass valable pour ${partyLabel}`,
                    canvas.width / 2,
                    122,
                );
            }
            context.drawImage(image, 110, 130, 500, 500);
            context.font = '500 20px monospace';
            context.fillText(
                `Référence : ${inviteToken}`,
                canvas.width / 2,
                690,
            );
            context.font = '18px sans-serif';
            context.fillStyle = '#78716c';
            context.fillText(
                'Présentez ce code à l’agent d’accueil',
                canvas.width / 2,
                735,
            );
            const link = document.createElement('a');
            link.download = `qr-${guest.first_name}-${guest.last_name}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    };

    const downloadInvitationCard = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height =
            2800 + timeline.length * 460 + (custom.background_image ? 650 : 0);
        const ctx = canvas.getContext('2d');
        const svg = document.querySelector('#guest-invitation-qr svg');
        if (!ctx || !svg) return;

        // Background base
        ctx.fillStyle = '#fdfbf7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#f5efe6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Elegant borders
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
        ctx.globalAlpha = 1.0;

        let currentY = 180;

        // Arch image
        if (custom.background_image) {
            try {
                const bg = await loadCanvasImage(custom.background_image);
                ctx.save();
                const archW = 660;
                const archH = 850;
                const archX = canvas.width / 2 - archW / 2;
                const archY = 120;
                const archR = archW / 2;

                ctx.beginPath();
                ctx.moveTo(archX, archY + archH);
                ctx.lineTo(archX, archY + archR);
                ctx.arc(archX + archR, archY + archR, archR, Math.PI, 0);
                ctx.lineTo(archX + archW, archY + archH);
                ctx.closePath();

                // shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 40;
                ctx.shadowOffsetY = 20;
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.clip();

                const scale = Math.max(archW / bg.width, archH / bg.height);
                const imgW = bg.width * scale;
                const imgH = bg.height * scale;
                ctx.drawImage(
                    bg,
                    archX + archW / 2 - imgW / 2,
                    archY + archH / 2 - imgH / 2,
                    imgW,
                    imgH,
                );
                ctx.restore();

                // Inner border for arch
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(archX + 18, archY + archH - 18);
                ctx.lineTo(archX + 18, archY + archR);
                ctx.arc(archX + archR, archY + archR, archR - 18, Math.PI, 0);
                ctx.lineTo(archX + archW - 18, archY + archH - 18);
                ctx.closePath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.stroke();
                ctx.restore();

                currentY = archY + archH + 120;
            } catch (e) {
                console.error(e);
            }
        }

        ctx.textAlign = 'center';

        // Line separator
        ctx.beginPath();
        ctx.moveTo(420, currentY - 50);
        ctx.lineTo(660, currentY - 50);
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Eyebrow
        ctx.fillStyle = '#a8a29e';
        ctx.font = '600 20px sans-serif';
        ctx.fillText(custom.eyebrow.toUpperCase(), 540, currentY);
        currentY += 90;

        // Title
        ctx.fillStyle = '#292524';
        ctx.font = '500 76px serif';
        currentY = drawWrappedText(
            ctx,
            invitationTitle,
            540,
            currentY,
            850,
            90,
        );
        currentY += 80;

        // Date & Venue
        ctx.fillStyle = '#57534e';
        ctx.font = '600 28px sans-serif';
        if (formattedWeddingDate) {
            ctx.fillText(formattedWeddingDate.toUpperCase(), 540, currentY);
            currentY += 50;
        }
        if (wedding.venue) {
            ctx.font = '400 26px sans-serif';
            ctx.fillText(wedding.venue, 540, currentY);
            currentY += 100;
        } else {
            currentY += 60;
        }

        // Line separator
        ctx.beginPath();
        ctx.moveTo(480, currentY - 40);
        ctx.lineTo(600, currentY - 40);
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Greeting
        ctx.fillStyle = accentColor;
        ctx.font = 'italic 500 46px serif';
        ctx.fillText(
            custom.greeting.replace('{guest}', guestName),
            540,
            currentY,
        );
        currentY += 80;

        // Body
        ctx.fillStyle = '#57534e';
        ctx.font = '300 32px sans-serif';
        currentY = drawWrappedText(ctx, custom.body, 540, currentY, 740, 52);
        currentY += 80;

        if (hasCompanions) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.08)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 12;
            ctx.beginPath();
            ctx.roundRect(180, currentY, 720, 116, 58);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = `${accentColor}55`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(190, currentY + 10, 700, 96, 48);
            ctx.stroke();

            ctx.fillStyle = accentColor;
            ctx.font = '700 22px sans-serif';
            ctx.fillText('INVITATION ACCOMPAGNÉE', 540, currentY + 42);
            ctx.fillStyle = '#57534e';
            ctx.font = '400 24px sans-serif';
            ctx.fillText(
                `Ce carton est réservé pour ${partyLabel}.`,
                540,
                currentY + 78,
            );
            currentY += 170;
        } else {
            currentY += 40;
        }

        if (timeline.length > 0) {
            ctx.fillStyle = accentColor;
            ctx.font = '600 22px sans-serif';
            ctx.fillText('PROGRAMME', 540, currentY);
            currentY += 62;

            ctx.strokeStyle = '#e7e5e4';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(210, currentY - 20);
            ctx.lineTo(870, currentY - 20);
            ctx.stroke();

            for (const event of timeline) {
                const eventStartY = currentY;
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.07)';
                ctx.shadowBlur = 22;
                ctx.shadowOffsetY = 10;
                ctx.beginPath();
                ctx.roundRect(
                    150,
                    currentY,
                    780,
                    event.image_url ? 300 : 190,
                    34,
                );
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = accentColor;
                ctx.font = '700 24px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(
                    event.time?.substring(0, 5) || '',
                    200,
                    currentY + 58,
                );

                ctx.fillStyle = '#292524';
                ctx.font = '500 34px serif';
                ctx.fillText(
                    event.title || 'Moment de la célébration',
                    320,
                    currentY + 58,
                );

                ctx.fillStyle = '#78716c';
                ctx.font = '24px sans-serif';
                if (event.description) {
                    drawWrappedText(
                        ctx,
                        event.description,
                        320,
                        currentY + 100,
                        540,
                        38,
                    );
                }

                if (event.image_url) {
                    try {
                        const eventImage = await loadCanvasImage(
                            event.image_url,
                        );
                        const imageW = 260;
                        const imageH = 150;
                        const imageX = 320;
                        const imageY = currentY + 132;
                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(imageX, imageY, imageW, imageH, 24);
                        ctx.clip();
                        const scale = Math.max(
                            imageW / eventImage.width,
                            imageH / eventImage.height,
                        );
                        const imgW = eventImage.width * scale;
                        const imgH = eventImage.height * scale;
                        ctx.drawImage(
                            eventImage,
                            imageX + imageW / 2 - imgW / 2,
                            imageY + imageH / 2 - imgH / 2,
                            imgW,
                            imgH,
                        );
                        ctx.restore();
                    } catch (e) {
                        console.error(e);
                    }
                }

                if (event.sub_details?.length > 0) {
                    ctx.fillStyle = '#57534e';
                    ctx.font = '600 20px sans-serif';
                    const detailY = event.image_url
                        ? eventStartY + 230
                        : eventStartY + 145;
                    event.sub_details.slice(0, 3).forEach((detail, index) => {
                        ctx.fillText(`- ${detail}`, 610, detailY + index * 30);
                    });
                }

                ctx.textAlign = 'center';
                currentY += event.image_url ? 340 : 230;
            }

            currentY += 45;
        }

        // QR Code Box
        const qrImage = await loadCanvasImage(
            `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))}`,
        );
        const qrSize = 300;

        // Draw fancy box for QR
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(
            540 - qrSize / 2 - 25,
            currentY - 25,
            qrSize + 50,
            qrSize + 50,
            40,
        );
        ctx.fill();
        ctx.restore();

        ctx.drawImage(qrImage, 540 - qrSize / 2, currentY, qrSize, qrSize);
        currentY += qrSize + 70;

        ctx.fillStyle = '#292524';
        ctx.font = '700 26px monospace';
        ctx.fillText(`RÉF. ${inviteToken}`, 540, currentY);
        currentY += 100;

        ctx.fillStyle = '#78716c';
        ctx.font = '24px sans-serif';
        ctx.fillText(custom.footer, 540, currentY);

        // Final crop if needed - but returning as is maintains aspect cleanly.

        const link = document.createElement('a');
        link.download = `invitation-${guest.first_name}-${guest.last_name}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="flex min-h-screen flex-col items-center overflow-x-hidden bg-[#fdf8ef] font-sans selection:bg-primary/20">
            {/* INITIAL ENVELOPE VIEW */}
            <AnimatePresence>
                {!showLetter && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#15110f] px-4 py-8"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {custom.background_image && (
                            <img
                                src={custom.background_image}
                                alt=""
                                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-lg"
                            />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_50%),linear-gradient(180deg,rgba(21,17,15,0.5),rgba(21,17,15,0.98))]" />

                        <motion.button
                            type="button"
                            onClick={handleOpenEnvelope}
                            className="group relative w-full max-w-[360px] overflow-hidden rounded-[2.5rem] bg-[#fdfbf7] text-left shadow-[0_50px_150px_rgba(0,0,0,0.65)] ring-1 ring-white/20 transition-transform duration-700 outline-none hover:-translate-y-3 focus-visible:ring-4 focus-visible:ring-white/55 md:max-w-[480px]"
                            initial={{ y: 40, opacity: 0, rotateX: -10 }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                rotateX: envelopeOpened ? 12 : 0,
                                scale: envelopeOpened ? 0.92 : 1,
                            }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                        >
                            {/* Envelope Inner Styling */}
                            <div className="absolute inset-2 z-20 rounded-[2rem] border-[1.5px] border-stone-200/60 shadow-[inset_0_0_20px_rgba(0,0,0,0.04)]" />
                            <div className="absolute inset-4 z-20 rounded-[1.5rem] border border-stone-200/40" />

                            <div
                                className="absolute top-6 left-6 z-30 h-16 w-16 rounded-tl-[1.8rem] border-t-2 border-l-2 opacity-60 md:top-8 md:left-8 md:h-24 md:w-24"
                                style={{ borderColor: accentColor }}
                            />
                            <div
                                className="absolute top-6 right-6 z-30 h-16 w-16 rounded-tr-[1.8rem] border-t-2 border-r-2 opacity-60 md:top-8 md:right-8 md:h-24 md:w-24"
                                style={{ borderColor: accentColor }}
                            />
                            <div
                                className="absolute bottom-6 left-6 z-30 h-16 w-16 rounded-bl-[1.8rem] border-b-2 border-l-2 opacity-60 md:bottom-8 md:left-8 md:h-24 md:w-24"
                                style={{ borderColor: accentColor }}
                            />
                            <div
                                className="absolute right-6 bottom-6 z-30 h-16 w-16 rounded-br-[1.8rem] border-r-2 border-b-2 opacity-60 md:right-8 md:bottom-8 md:h-24 md:w-24"
                                style={{ borderColor: accentColor }}
                            />

                            <div className="relative h-[250px] overflow-hidden rounded-t-[2.5rem] md:h-[350px]">
                                {custom.background_image ? (
                                    <img
                                        src={custom.background_image}
                                        alt=""
                                        className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#f7d9cf,transparent_28%),radial-gradient(circle_at_78%_18%,#d8bda7,transparent_26%),linear-gradient(135deg,#7c2d2d,#f5efe6_60%,#315244)]" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#fdfbf7]" />
                                <div className="absolute inset-x-8 bottom-8 z-20 flex items-center justify-center gap-4 text-white drop-shadow-lg md:inset-x-12 md:bottom-12">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                                    <Flower2 className="h-5 w-5 text-white/90 md:h-6 md:w-6" />
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/90 to-transparent" />
                                </div>
                            </div>

                            <div className="relative z-30 px-6 pt-8 pb-12 text-center md:px-12 md:pt-10 md:pb-16">
                                <div
                                    className="mx-auto mb-4 flex max-w-[280px] items-center justify-center gap-3 text-[10px] font-bold tracking-[0.4em] uppercase md:mb-6 md:text-[12px] md:tracking-[0.5em]"
                                    style={{ color: accentColor }}
                                >
                                    <span className="h-px flex-1 bg-current opacity-50" />
                                    Save the date
                                    <span className="h-px flex-1 bg-current opacity-50" />
                                </div>
                                <p className="text-[10px] font-semibold tracking-[0.25em] text-stone-400 uppercase md:text-xs md:tracking-[0.35em]">
                                    {custom.eyebrow}
                                </p>
                                <h1 className="mt-4 font-display text-4xl leading-[1.1] font-medium text-stone-800 drop-shadow-sm md:mt-6 md:text-6xl">
                                    {invitationTitle}
                                </h1>
                                {hasCompanions && (
                                    <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-[10px] font-bold tracking-[0.22em] text-stone-500 uppercase shadow-sm backdrop-blur md:mt-7 md:px-5 md:py-2.5 md:text-[11px]">
                                        <Users
                                            className="h-3.5 w-3.5"
                                            style={{ color: accentColor }}
                                        />
                                        {partyLabel} attendues
                                    </div>
                                )}
                                <div className="mx-auto mt-6 h-[1px] w-16 bg-gradient-to-r from-transparent via-stone-400 to-transparent md:mt-8 md:w-24" />

                                {formattedWeddingDate && (
                                    <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-stone-600 uppercase md:mt-8 md:text-sm md:tracking-[0.3em]">
                                        {formattedWeddingDate}
                                    </p>
                                )}

                                {/* Beautiful Wax Seal Element */}
                                <div className="mt-8 flex flex-col items-center justify-center md:mt-10">
                                    <div
                                        className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.4),inset_0_-4px_10px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] md:h-20 md:w-20"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        <div className="absolute inset-[3px] rounded-full border border-white/20" />
                                        <div className="absolute inset-[5px] rounded-full border border-black/15 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)]" />
                                        <Heart
                                            className="h-6 w-6 text-white/90 drop-shadow-md md:h-8 md:w-8"
                                            fill="currentColor"
                                        />
                                    </div>
                                    <p className="mt-5 text-[10px] font-bold tracking-[0.3em] text-stone-400 uppercase transition-colors group-hover:text-stone-700 md:mt-6 md:text-[11px]">
                                        Cliquer ici pour ouvrir l'invitation
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FULL LETTER VIEW */}
            {showLetter && (
                <motion.div
                    className="flex w-full max-w-[900px] flex-col items-center px-4 py-8 md:py-16 lg:py-24"
                    initial={{ opacity: 0, y: 100, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    <Card className="relative w-full overflow-hidden rounded-[2.5rem] border-0 bg-white/95 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] backdrop-blur-xl md:rounded-[4.5rem]">
                        {/* Elegant Background Texture & Effects */}
                        <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-[0.04]" />
                        <div
                            className="pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-10 -translate-y-10 rounded-full opacity-[0.12] blur-3xl md:h-[500px] md:w-[500px] md:translate-x-20 md:-translate-y-20"
                            style={{ backgroundColor: accentColor }}
                        />
                        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-10 translate-y-10 rounded-full bg-stone-300/40 blur-3xl md:h-[500px] md:w-[500px] md:-translate-x-20 md:translate-y-20" />

                        {/* Animated Petals Background */}
                        <div
                            className="pointer-events-none absolute inset-0 overflow-hidden"
                            style={{
                                maskImage:
                                    'linear-gradient(to bottom, black 20%, transparent 80%)',
                                WebkitMaskImage:
                                    'linear-gradient(to bottom, black 20%, transparent 80%)',
                            }}
                        >
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Particle
                                    key={`petal-${i}`}
                                    delay={i * 1.5}
                                    color={accentColor}
                                />
                            ))}
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Particle
                                    key={`star-${i}`}
                                    delay={i * 2.1}
                                    color={accentColor}
                                    isStar
                                />
                            ))}
                        </div>

                        <div
                            className="pointer-events-none absolute top-0 right-0 left-0 h-1.5 md:h-2.5"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                            }}
                        />
                        <div
                            className="pointer-events-none absolute right-0 bottom-0 left-0 h-1.5 md:h-2.5"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                            }}
                        />
                        <div
                            className="pointer-events-none absolute top-0 bottom-0 left-0 w-1.5 md:w-2.5"
                            style={{
                                background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
                            }}
                        />
                        <div
                            className="pointer-events-none absolute top-0 right-0 bottom-0 w-1.5 md:w-2.5"
                            style={{
                                background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
                            }}
                        />

                        <div className="relative z-10 space-y-14 p-6 md:space-y-20 md:p-14 lg:p-24">
                            {/* Header section */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="relative space-y-6 text-center md:space-y-8"
                            >
                                {custom.background_image && (
                                    <div className="group relative mx-auto mt-4 mb-14 max-w-xs md:mb-20 md:max-w-xl">
                                        <motion.div
                                            initial={{
                                                scale: 0.9,
                                                opacity: 0,
                                                y: 40,
                                            }}
                                            animate={{
                                                scale: 1,
                                                opacity: 1,
                                                y: 0,
                                            }}
                                            transition={{
                                                delay: 0.6,
                                                duration: 1.2,
                                                ease: 'easeOut',
                                            }}
                                            className="relative rounded-t-[10rem] border border-stone-100 bg-white p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] md:rounded-t-[14rem] md:p-4"
                                        >
                                            <div className="relative overflow-hidden rounded-t-[9.5rem] border-[4px] border-white bg-stone-100 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] md:rounded-t-[13.5rem] md:border-[8px]">
                                                <img
                                                    src={
                                                        custom.background_image
                                                    }
                                                    alt=""
                                                    className="aspect-[4/5] w-full object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-105"
                                                />

                                                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-stone-900/70 via-stone-900/5 to-transparent" />

                                                {/* Shimmer sweep */}
                                                <motion.div
                                                    initial={{
                                                        x: '-100%',
                                                        y: '-100%',
                                                        opacity: 0,
                                                    }}
                                                    animate={{
                                                        x: '100%',
                                                        y: '100%',
                                                        opacity: [0, 0.4, 0],
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 4,
                                                        ease: 'easeInOut',
                                                        repeatDelay: 1.5,
                                                    }}
                                                    className="pointer-events-none absolute inset-0 z-10 h-[200%] w-[200%] rotate-45 bg-gradient-to-br from-transparent via-white/40 to-transparent"
                                                />

                                                {/* Inner elegant line */}
                                                <div className="pointer-events-none absolute inset-2 z-20 rounded-t-[9.5rem] border border-white/40 md:inset-4 md:rounded-t-[13.5rem]" />

                                                <div className="pointer-events-none absolute right-0 bottom-6 left-0 z-20 flex flex-col items-center justify-center gap-3 text-white md:bottom-10">
                                                    <div className="flex w-full items-center gap-4 px-10 md:gap-8 md:px-20">
                                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                                                        <Flower2 className="h-5 w-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] md:h-7 md:w-7" />
                                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/90 to-transparent" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Floral Decorations outside the frame */}
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    rotate: -45,
                                                    scale: 0,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    rotate: -15,
                                                    scale: 1,
                                                }}
                                                transition={{
                                                    delay: 1.4,
                                                    duration: 1.2,
                                                }}
                                                className="absolute -bottom-6 -left-6 text-stone-200 drop-shadow-xl md:-bottom-10 md:-left-10"
                                                style={{ color: accentColor }}
                                            >
                                                <Leaf className="h-12 w-12 opacity-60 md:h-20 md:w-20" />
                                            </motion.div>
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    rotate: 45,
                                                    scale: 0,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    rotate: 15,
                                                    scale: 1,
                                                }}
                                                transition={{
                                                    delay: 1.6,
                                                    duration: 1.2,
                                                }}
                                                className="absolute -right-6 -bottom-6 text-stone-200 drop-shadow-xl md:-right-10 md:-bottom-10"
                                                style={{ color: accentColor }}
                                            >
                                                <Leaf className="h-12 w-12 scale-x-[-1] transform opacity-60 md:h-20 md:w-20" />
                                            </motion.div>
                                        </motion.div>
                                    </div>
                                )}

                                <div className="mb-6 flex items-center justify-center gap-4 md:mb-12">
                                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-primary/50 md:w-24" />
                                    <Leaf className="h-3 w-3 text-primary/60 md:h-4 md:w-4" />
                                    <Heart
                                        className="mx-2 h-5 w-5 md:mx-4 md:h-7 md:w-7"
                                        style={{ color: accentColor }}
                                        fill="currentColor"
                                    />
                                    <Leaf className="h-3 w-3 scale-x-[-1] text-primary/60 md:h-4 md:w-4" />
                                    <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-primary/50 md:w-24" />
                                </div>

                                <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-stone-400 uppercase md:mb-6 md:text-sm md:tracking-[0.4em]">
                                    {custom.eyebrow}
                                </p>
                                <h1 className="font-display text-4xl leading-[1.1] font-medium tracking-tight text-stone-800 sm:text-5xl md:text-6xl md:leading-[1.1] lg:text-7xl">
                                    <span className="bg-gradient-to-r from-stone-800 via-stone-600 to-stone-800 bg-clip-text text-transparent">
                                        {custom.title || wedding.title}
                                    </span>
                                </h1>

                                <div className="mt-10 flex flex-col items-center justify-center gap-4 font-medium text-stone-600 md:mt-14 md:flex-row md:gap-12">
                                    {formattedWeddingDate && (
                                        <div className="flex items-center gap-3 rounded-full border border-stone-100 bg-stone-50/80 px-6 py-3 text-sm shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-1 md:px-8 md:py-4 md:text-base">
                                            <CalendarDays className="h-4 w-4 text-primary/80 md:h-5 md:w-5" />
                                            <span className="text-xs tracking-wide uppercase md:text-sm">
                                                {formattedWeddingDate}
                                            </span>
                                        </div>
                                    )}
                                    {wedding.venue && (
                                        <div className="flex items-center gap-3 rounded-full border border-stone-100 bg-stone-50/80 px-6 py-3 text-sm shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-1 md:px-8 md:py-4 md:text-base">
                                            <MapPin className="h-4 w-4 text-primary/80 md:h-5 md:w-5" />
                                            <span className="text-xs tracking-wide uppercase md:text-sm">
                                                {wedding.venue}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Personalized Greeting */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-100px' }}
                                transition={{ duration: 1 }}
                                className="relative mx-auto max-w-3xl py-10 text-center md:py-16"
                            >
                                <div className="absolute top-0 left-1/2 h-[1px] w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-stone-300 to-transparent md:w-48" />
                                <div className="absolute bottom-0 left-1/2 h-[1px] w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-stone-300 to-transparent md:w-48" />

                                <p className="mb-6 font-display text-2xl leading-normal text-stone-800 sm:text-3xl md:mb-10 md:text-4xl">
                                    {greetingParts[0]}
                                    <span
                                        className="italic"
                                        style={{ color: accentColor }}
                                    >
                                        {guestName}
                                    </span>
                                    {greetingParts[1]}
                                </p>
                                <p className="text-sm leading-relaxed font-light text-stone-500 sm:text-base md:text-lg md:leading-loose">
                                    {custom.body}
                                </p>
                                {hasCompanions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 18 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{
                                            duration: 0.8,
                                            delay: 0.1,
                                        }}
                                        className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-[1.75rem] border border-stone-100 bg-gradient-to-br from-white via-stone-50/80 to-white p-1 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.28)] md:mt-10"
                                    >
                                        <div className="relative rounded-[1.45rem] px-6 py-6 md:px-10 md:py-7">
                                            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                            <div className="mb-4 flex items-center justify-center gap-3">
                                                <span className="h-px w-10 bg-stone-200" />
                                                <span
                                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-100"
                                                    style={{
                                                        color: accentColor,
                                                    }}
                                                >
                                                    <Users className="h-5 w-5" />
                                                </span>
                                                <span className="h-px w-10 bg-stone-200" />
                                            </div>
                                            <p className="text-[10px] font-bold tracking-[0.35em] text-stone-400 uppercase">
                                                Votre douce compagnie
                                            </p>
                                            <p className="mt-3 text-sm leading-relaxed font-light text-stone-600 md:text-base">
                                                {companionLine} Nous avons
                                                préparé votre accueil pour{' '}
                                                <span
                                                    className="font-semibold"
                                                    style={{
                                                        color: accentColor,
                                                    }}
                                                >
                                                    {partyLabel}
                                                </span>
                                                .
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>

                            {announcements.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="mx-auto max-w-4xl space-y-3"
                                >
                                    {announcements.map((announcement) => (
                                        <div
                                            key={announcement.id}
                                            className="rounded-[1.5rem] border border-primary/15 bg-primary/5 px-5 py-4 text-left shadow-sm md:px-8 md:py-5"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
                                                    style={{
                                                        color: accentColor,
                                                    }}
                                                >
                                                    <Bell className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="font-display text-lg text-stone-800">
                                                        {announcement.title}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                                                        {announcement.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {/* RSVP Form */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ duration: 1 }}
                                className="group relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-stone-100/60 bg-white p-6 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] sm:p-8 md:rounded-[3rem] md:p-16"
                            >
                                <div
                                    className="absolute top-0 left-0 h-1.5 w-full md:h-2"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
                                    }}
                                />

                                <Label className="mb-6 block text-center text-xs font-bold tracking-widest text-stone-400 uppercase md:mb-10 md:text-sm">
                                    {custom.rsvp_question}
                                </Label>
                                <div className="flex flex-col gap-4 px-2 sm:flex-row sm:gap-6 md:px-8">
                                    <Button
                                        onClick={() => handleRSVP('confirmed')}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'relative h-14 flex-1 overflow-hidden rounded-xl text-sm font-medium transition-all duration-500 md:h-20 md:rounded-[1.5rem] md:text-lg',
                                            isAttending
                                                ? 'scale-[1.02] bg-green-600 text-white shadow-[0_15px_30px_rgba(22,163,74,0.3)] hover:bg-green-700'
                                                : 'bg-stone-900 text-white hover:-translate-y-1 hover:bg-stone-800 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)]',
                                        )}
                                    >
                                        <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                                        {isAttending ? (
                                            <CheckCircle2 className="mr-2 h-5 w-5 md:mr-3 md:h-6 md:w-6" />
                                        ) : (
                                            <Heart className="mr-2 h-5 w-5 md:mr-3 md:h-6 md:w-6" />
                                        )}
                                        {isAttending
                                            ? 'Présence confirmée'
                                            : custom.accept_label}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleRSVP('declined')}
                                        disabled={isSubmitting}
                                        className={cn(
                                            'h-14 flex-1 rounded-xl border-2 text-sm font-medium transition-all duration-500 md:h-20 md:rounded-[1.5rem] md:text-lg',
                                            isDeclined
                                                ? 'scale-[1.02] border-red-200 bg-red-50 text-red-600'
                                                : 'border-stone-200 text-stone-500 hover:-translate-y-1 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800',
                                        )}
                                    >
                                        {isDeclined ? (
                                            <XCircle className="mr-2 h-5 w-5 md:mr-3 md:h-6 md:w-6" />
                                        ) : null}
                                        {isDeclined
                                            ? 'Absence confirmée'
                                            : custom.decline_label}
                                    </Button>
                                </div>
                                {!isAttending && !isDeclined && (
                                    <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed font-light text-stone-400 md:mt-8 md:text-sm">
                                        Le programme, votre table et votre code
                                        d’accès apparaîtront dès que votre
                                        présence sera confirmée.
                                        {hasCompanions
                                            ? ` Cette réponse comptera pour ${partyLabel}.`
                                            : ''}
                                    </p>
                                )}
                                {isDeclined && (
                                    <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed font-light text-stone-400 md:mt-8 md:text-sm">
                                        Merci pour votre réponse. Nous garderons
                                        une pensée pour vous pendant la
                                        célébration.
                                    </p>
                                )}
                            </motion.div>

                            {/* Timeline Section */}
                            {isAttending && timeline.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 1 }}
                                    className="mx-auto max-w-5xl rounded-[2rem] border border-stone-100/50 bg-stone-50/80 p-6 shadow-sm sm:p-8 md:rounded-[3rem] md:p-16"
                                >
                                    <div className="mb-10 flex flex-col items-center justify-center md:mb-16">
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm md:mb-6 md:h-16 md:w-16">
                                            <Clock className="h-6 w-6 md:h-8 md:w-8" />
                                        </div>
                                        <h3 className="text-center font-display text-3xl text-stone-800 md:text-4xl">
                                            Programme des Festivités
                                        </h3>
                                    </div>

                                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-[2px] before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-stone-300 before:to-transparent md:space-y-12 md:before:mx-auto md:before:ml-6 md:before:translate-x-0">
                                        {timeline.map((event, idx) => (
                                            <div
                                                key={event.id}
                                                className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
                                            >
                                                <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[4px] border-white bg-stone-100 text-stone-500 shadow-md transition-transform duration-500 group-hover:scale-125 group-hover:border-primary/20 group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] md:order-1 md:h-12 md:w-12 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                    <span className="text-[10px] font-bold tracking-widest md:text-[11px]">
                                                        {event.time.substring(
                                                            0,
                                                            5,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="w-[calc(100%-3.5rem)] rounded-2xl border border-stone-100 bg-white p-5 text-left shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] transition-all duration-500 group-hover:border-stone-200 hover:-translate-y-2 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] md:w-[calc(50%-4rem)] md:rounded-[2rem] md:p-8 md:group-odd:text-right">
                                                    {event.image_url && (
                                                        <div className="mb-4 overflow-hidden rounded-xl md:mb-6 md:rounded-2xl">
                                                            <img
                                                                src={
                                                                    event.image_url
                                                                }
                                                                alt=""
                                                                className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            />
                                                        </div>
                                                    )}
                                                    <h4 className="mb-2 font-display text-xl text-stone-800 md:mb-3 md:text-2xl">
                                                        {event.title}
                                                    </h4>
                                                    {event.description && (
                                                        <p className="text-sm leading-relaxed font-light text-stone-500 md:text-base">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                    {event.sub_details?.length >
                                                        0 && (
                                                        <div className="mt-4 space-y-2 md:mt-6">
                                                            {event.sub_details.map(
                                                                (
                                                                    detail,
                                                                    index,
                                                                ) => (
                                                                    <div
                                                                        key={`${event.id}-${index}`}
                                                                        className="mr-2 inline-block rounded-xl border border-stone-100 bg-stone-50 px-4 py-2 text-xs font-medium text-stone-600 last:mr-0 md:mr-0 md:block md:px-5 md:py-2.5 md:text-sm"
                                                                    >
                                                                        {detail}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Table Info Section */}
                            {isAttending && table && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 1 }}
                                    className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-stone-100/50 bg-stone-50/80 p-6 text-center shadow-sm sm:p-8 md:rounded-[3rem] md:p-16"
                                >
                                    <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/5 md:h-80 md:w-80" />
                                    <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-tr-full bg-primary/5 md:h-80 md:w-80" />

                                    <div className="relative z-10">
                                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm md:mb-6 md:h-16 md:w-16">
                                            <Utensils className="h-6 w-6 md:h-8 md:w-8" />
                                        </div>
                                        <h3 className="mb-6 font-display text-2xl text-stone-800 md:mb-10 md:text-4xl">
                                            Votre Table
                                        </h3>

                                        <div className="mb-8 inline-flex items-center justify-center rounded-full border border-primary/20 bg-white px-8 py-4 text-xl font-bold text-primary shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 md:mb-12 md:px-14 md:py-6 md:text-3xl">
                                            {table.name}
                                        </div>

                                        {coGuests.length > 0 ? (
                                            <div className="mx-auto max-w-xl">
                                                <div className="mb-6 flex items-center justify-center gap-3 md:mb-8 md:gap-4">
                                                    <div className="h-px flex-1 bg-stone-200" />
                                                    <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-stone-400 uppercase md:text-xs">
                                                        <Users className="h-3 w-3 md:h-4 md:w-4" />
                                                        Vous serez accompagné(e)
                                                        de
                                                    </p>
                                                    <div className="h-px flex-1 bg-stone-200" />
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                                                    {coGuests.map((cg) => (
                                                        <span
                                                            key={cg.id}
                                                            className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-xs font-medium text-stone-600 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md md:px-6 md:py-3 md:text-sm"
                                                        >
                                                            {cg.first_name}{' '}
                                                            {cg.last_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-light text-stone-400 md:text-sm">
                                                Vous êtes le premier convive
                                                assigné à cette table !
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {isAttending && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 1 }}
                                    className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent p-6 text-center shadow-sm sm:p-8 md:rounded-[3rem] md:p-16"
                                >
                                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                    <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary shadow-md md:mb-8 md:h-20 md:w-20 md:rounded-3xl">
                                        <QrCode className="h-6 w-6 md:h-10 md:w-10" />
                                    </div>
                                    <h3 className="font-display text-2xl text-stone-800 md:text-4xl">
                                        Votre passe d'accès
                                    </h3>
                                    <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed font-light text-stone-500 md:mt-6 md:text-base">
                                        Ce QR code est votre invitation
                                        personnelle. Présentez-le à l’entrée
                                        pour accéder aux festivités.
                                    </p>
                                    {hasCompanions && (
                                        <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-primary/10 bg-white/75 px-5 py-4 text-sm font-medium text-stone-600 shadow-sm">
                                            <Users className="h-5 w-5 shrink-0 text-primary" />
                                            <span>
                                                Ce pass couvre votre arrivée en
                                                groupe: {partyLabel} au total.
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        id="guest-invitation-qr"
                                        className="mx-auto mt-8 w-fit rounded-[1.5rem] bg-white p-5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] transition-transform duration-500 hover:scale-105 md:mt-12 md:rounded-[2.5rem] md:p-8"
                                    >
                                        <QRCodeSVG
                                            value={invitationUrl}
                                            size={220}
                                            level="H"
                                            includeMargin
                                        />
                                    </div>
                                    <p className="mt-6 font-mono text-xs font-bold tracking-[0.3em] text-stone-400 md:mt-8 md:text-sm">
                                        RÉF. {inviteToken}
                                    </p>

                                    <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row md:mt-12 md:gap-6">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-14 rounded-xl border-2 border-primary/20 px-6 text-sm font-bold text-primary transition-all hover:border-primary/40 hover:bg-primary/5 md:h-16 md:rounded-2xl md:px-10 md:text-base"
                                            onClick={downloadGuestQr}
                                        >
                                            <Download className="mr-2 h-4 w-4 md:mr-3 md:h-5 md:w-5" />
                                            Sauvegarder le pass
                                        </Button>
                                        <Button
                                            type="button"
                                            className="h-14 rounded-xl bg-stone-900 px-6 text-sm font-bold text-white shadow-xl transition-transform hover:-translate-y-1 hover:bg-stone-800 md:h-16 md:rounded-2xl md:px-10 md:text-base"
                                            onClick={downloadInvitationCard}
                                        >
                                            <Download className="mr-2 h-4 w-4 md:mr-3 md:h-5 md:w-5" />
                                            Télécharger la carte
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Form Section */}
                            {isAttending && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 1 }}
                                    className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] border border-stone-100 bg-white p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.1)] sm:p-8 md:rounded-[3rem] md:p-16"
                                >
                                    <div
                                        className="absolute top-0 left-0 h-full w-1.5 md:w-2"
                                        style={{
                                            background: `linear-gradient(180deg, ${accentColor}, ${accentColor}20)`,
                                        }}
                                    />

                                    <div className="mb-6 flex items-center gap-3 md:mb-10 md:gap-6">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner md:h-16 md:w-16">
                                            <GlassWater className="h-5 w-5 md:h-8 md:w-8" />
                                        </div>
                                        <h3 className="font-display text-2xl leading-tight text-stone-800 md:text-4xl">
                                            Préférences boissons
                                        </h3>
                                    </div>

                                    <div className="space-y-5 md:space-y-10 md:pl-4">
                                        <div className="space-y-4 md:space-y-6">
                                            <p className="max-w-2xl text-sm leading-relaxed font-light text-stone-500 md:text-base">
                                                Aidez-nous à préparer votre
                                                service en choisissant vos
                                                boissons favorites (jusqu'à 5).
                                            </p>

                                            <Dialog
                                                open={isMenuModalOpen}
                                                onOpenChange={
                                                    setIsMenuModalOpen
                                                }
                                            >
                                                <DialogTrigger asChild>
                                                    <button
                                                        className={cn(
                                                            'group flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all duration-300 md:min-h-24 md:gap-6 md:rounded-[2rem] md:px-8 md:py-5',
                                                            menuPreferences.length >
                                                                0
                                                                ? 'border-primary/40 bg-primary/5 shadow-md hover:bg-primary/10 hover:shadow-lg'
                                                                : 'border-stone-200 bg-stone-50 shadow-sm hover:border-stone-300 hover:bg-white hover:shadow-md',
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors md:h-14 md:w-14',
                                                                menuPreferences.length >
                                                                    0
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-white text-stone-400 group-hover:text-stone-600',
                                                            )}
                                                        >
                                                            <GlassWater className="h-5 w-5 md:h-7 md:w-7" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            {menuPreferences.length >
                                                            0 ? (
                                                                <div>
                                                                    <span className="mb-0.5 block text-sm font-bold text-primary md:mb-1 md:text-lg">
                                                                        {
                                                                            menuPreferences.length
                                                                        }{' '}
                                                                        choix
                                                                        sélectionné
                                                                        {menuPreferences.length >
                                                                        1
                                                                            ? 's'
                                                                            : ''}
                                                                    </span>
                                                                    <span className="text-[10px] font-medium tracking-wide text-primary/70 uppercase md:text-xs">
                                                                        Cliquez
                                                                        pour
                                                                        modifier
                                                                        vos
                                                                        choix
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <span className="mb-0.5 block text-sm font-bold text-stone-700 md:mb-1 md:text-lg">
                                                                        Découvrir
                                                                        les
                                                                        boissons
                                                                    </span>
                                                                    <span className="text-[10px] font-light text-stone-500 md:text-xs">
                                                                        Choisir
                                                                        vos
                                                                        préférences
                                                                        boissons
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {menuPreferences.length >
                                                            0 && (
                                                            <span className="shrink-0 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-bold text-primary shadow-sm md:px-5 md:py-2 md:text-sm">
                                                                {
                                                                    menuPreferences.length
                                                                }
                                                                /
                                                                {
                                                                    MAX_PREFERENCES
                                                                }
                                                            </span>
                                                        )}
                                                    </button>
                                                </DialogTrigger>

                                                <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border-0 bg-stone-50 p-0 shadow-2xl md:w-full md:rounded-[3rem]">
                                                    {/* Header */}
                                                    <div className="relative shrink-0 border-b border-stone-100 bg-white p-5 md:p-12">
                                                        <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/5 md:h-64 md:w-64" />
                                                        <div className="flex items-start gap-3 md:gap-6">
                                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-inner md:h-20 md:w-20 md:rounded-[2rem]">
                                                                <GlassWater className="h-6 w-6 text-primary md:h-10 md:w-10" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <DialogTitle className="font-display text-2xl leading-tight text-stone-800 md:text-4xl">
                                                                    Carte des
                                                                    boissons
                                                                </DialogTitle>
                                                                <DialogDescription className="mt-2 text-sm font-light text-stone-500 md:mt-3 md:text-base">
                                                                    Choisissez
                                                                    vos favoris
                                                                    parmi nos
                                                                    propositions
                                                                </DialogDescription>
                                                            </div>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div className="mt-5 md:mt-10">
                                                            <div className="mb-3 flex items-center justify-between md:mb-4">
                                                                <span className="text-xs font-bold tracking-widest text-stone-500 uppercase md:text-sm">
                                                                    Mes
                                                                    sélections
                                                                </span>
                                                                <span
                                                                    className={cn(
                                                                        'text-xs font-bold md:text-sm',
                                                                        menuPreferences.length >=
                                                                            MAX_PREFERENCES
                                                                            ? 'text-primary'
                                                                            : 'text-stone-600',
                                                                    )}
                                                                >
                                                                    {
                                                                        menuPreferences.length
                                                                    }{' '}
                                                                    /{' '}
                                                                    {
                                                                        MAX_PREFERENCES
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="h-2 overflow-hidden rounded-full bg-stone-100 shadow-inner md:h-3">
                                                                <motion.div
                                                                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                                                                    animate={{
                                                                        width: `${(menuPreferences.length / MAX_PREFERENCES) * 100}%`,
                                                                    }}
                                                                    transition={{
                                                                        type: 'spring',
                                                                        stiffness: 300,
                                                                        damping: 30,
                                                                    }}
                                                                />
                                                            </div>
                                                            {menuPreferences.length >=
                                                                MAX_PREFERENCES && (
                                                                <motion.p
                                                                    initial={{
                                                                        opacity: 0,
                                                                    }}
                                                                    animate={{
                                                                        opacity: 1,
                                                                    }}
                                                                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary md:mt-4 md:gap-2 md:text-sm"
                                                                >
                                                                    <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
                                                                    Maximum
                                                                    atteint !
                                                                    Vous pouvez
                                                                    déselectionner
                                                                    pour
                                                                    modifier.
                                                                </motion.p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Scrollable content grouped by category */}
                                                    <div className="flex-1 space-y-8 overflow-y-auto p-4 md:space-y-16 md:p-12">
                                                        {menuItems.length ===
                                                        0 ? (
                                                            <div className="py-12 text-center md:py-24">
                                                                <Utensils className="mx-auto mb-4 h-12 w-12 text-stone-200 md:mb-8 md:h-20 md:w-20" />
                                                                <p className="text-base font-light text-stone-400 md:text-xl">
                                                                    Le menu
                                                                    n'est pas
                                                                    encore
                                                                    disponible.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            Object.entries(
                                                                menuItems.reduce(
                                                                    (
                                                                        acc: Record<
                                                                            string,
                                                                            any[]
                                                                        >,
                                                                        item,
                                                                    ) => {
                                                                        const cat =
                                                                            item.category ||
                                                                            'other';
                                                                        if (
                                                                            !acc[
                                                                                cat
                                                                            ]
                                                                        )
                                                                            acc[
                                                                                cat
                                                                            ] =
                                                                                [];
                                                                        acc[
                                                                            cat
                                                                        ].push(
                                                                            item,
                                                                        );
                                                                        return acc;
                                                                    },
                                                                    {},
                                                                ),
                                                            ).map(
                                                                ([
                                                                    category,
                                                                    items,
                                                                ]) => {
                                                                    const catMeta =
                                                                        CATEGORY_LABELS[
                                                                            category
                                                                        ] || {
                                                                            label: category,
                                                                            emoji: '🍴',
                                                                        };
                                                                    return (
                                                                        <div
                                                                            key={
                                                                                category
                                                                            }
                                                                        >
                                                                            <div className="mb-4 flex items-center gap-3 md:mb-8 md:gap-5">
                                                                                <span className="text-xl md:text-3xl">
                                                                                    {
                                                                                        catMeta.emoji
                                                                                    }
                                                                                </span>
                                                                                <h4 className="font-display text-xl leading-tight text-stone-700 md:text-3xl">
                                                                                    {
                                                                                        catMeta.label
                                                                                    }
                                                                                </h4>
                                                                                <div className="h-[2px] flex-1 bg-stone-100" />
                                                                            </div>
                                                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
                                                                                {(
                                                                                    items as any[]
                                                                                ).map(
                                                                                    (
                                                                                        item,
                                                                                    ) => {
                                                                                        const isSelected =
                                                                                            menuPreferences.includes(
                                                                                                item.id,
                                                                                            );
                                                                                        const isDisabled =
                                                                                            !isSelected &&
                                                                                            menuPreferences.length >=
                                                                                                MAX_PREFERENCES;
                                                                                        return (
                                                                                            <motion.button
                                                                                                key={
                                                                                                    item.id
                                                                                                }
                                                                                                type="button"
                                                                                                whileHover={
                                                                                                    !isDisabled
                                                                                                        ? {
                                                                                                              scale: 1.02,
                                                                                                          }
                                                                                                        : {}
                                                                                                }
                                                                                                whileTap={
                                                                                                    !isDisabled
                                                                                                        ? {
                                                                                                              scale: 0.98,
                                                                                                          }
                                                                                                        : {}
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    !isDisabled ||
                                                                                                    isSelected
                                                                                                        ? toggleMenuPreference(
                                                                                                              item.id,
                                                                                                          )
                                                                                                        : undefined
                                                                                                }
                                                                                                className={cn(
                                                                                                    'group relative flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-300 md:gap-5 md:rounded-[2rem] md:p-6',
                                                                                                    isSelected
                                                                                                        ? 'border-primary bg-primary/5 shadow-[0_10px_20px_rgba(0,0,0,0.05)]'
                                                                                                        : isDisabled
                                                                                                          ? 'cursor-not-allowed border-stone-100 bg-stone-100/60 opacity-50'
                                                                                                          : 'border-transparent bg-white hover:border-stone-200 hover:shadow-md',
                                                                                                )}
                                                                                            >
                                                                                                <div
                                                                                                    className={cn(
                                                                                                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm transition-all duration-300 md:h-16 md:w-16 md:rounded-2xl md:text-3xl',
                                                                                                        isSelected
                                                                                                            ? 'scale-110 bg-white'
                                                                                                            : 'bg-stone-50 group-hover:scale-105 group-hover:bg-white',
                                                                                                    )}
                                                                                                >
                                                                                                    {item.emoji ||
                                                                                                        '🍽️'}
                                                                                                </div>
                                                                                                <div className="min-w-0 flex-1 pr-7 md:pr-10">
                                                                                                    <p
                                                                                                        className={cn(
                                                                                                            'mb-1 text-sm leading-tight font-bold md:mb-2 md:text-lg',
                                                                                                            isSelected
                                                                                                                ? 'text-primary'
                                                                                                                : 'text-stone-800',
                                                                                                        )}
                                                                                                    >
                                                                                                        {
                                                                                                            item.name
                                                                                                        }
                                                                                                    </p>
                                                                                                    {item.description && (
                                                                                                        <p className="line-clamp-2 text-xs leading-relaxed font-light text-stone-500 md:text-sm">
                                                                                                            {
                                                                                                                item.description
                                                                                                            }
                                                                                                        </p>
                                                                                                    )}
                                                                                                </div>
                                                                                                {/* Checkmark */}
                                                                                                <div
                                                                                                    className={cn(
                                                                                                        'absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 md:top-6 md:right-6 md:h-8 md:w-8',
                                                                                                        isSelected
                                                                                                            ? 'scale-100 border-primary bg-primary shadow-md'
                                                                                                            : 'scale-75 border-stone-200 opacity-0 group-hover:scale-100 group-hover:bg-stone-50 group-hover:opacity-100',
                                                                                                    )}
                                                                                                >
                                                                                                    <Check
                                                                                                        className={cn(
                                                                                                            'h-3 w-3 transition-colors md:h-5 md:w-5',
                                                                                                            isSelected
                                                                                                                ? 'text-white'
                                                                                                                : 'text-stone-300',
                                                                                                        )}
                                                                                                    />
                                                                                                </div>
                                                                                            </motion.button>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                },
                                                            )
                                                        )}
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="relative z-10 flex shrink-0 flex-col items-stretch gap-3 border-t border-stone-100 bg-white p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center md:gap-8 md:p-10">
                                                        {menuPreferences.length >
                                                            0 && (
                                                            <div className="flex max-h-20 flex-1 flex-wrap gap-1.5 overflow-y-auto md:max-h-none md:gap-3">
                                                                {menuPreferences.map(
                                                                    (id) => {
                                                                        const item =
                                                                            menuItems.find(
                                                                                (
                                                                                    m,
                                                                                ) =>
                                                                                    m.id ===
                                                                                    id,
                                                                            );
                                                                        return item ? (
                                                                            <span
                                                                                key={
                                                                                    id
                                                                                }
                                                                                className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm md:gap-2 md:px-5 md:py-2.5 md:text-sm"
                                                                            >
                                                                                {
                                                                                    item.emoji
                                                                                }{' '}
                                                                                <span className="hidden sm:inline">
                                                                                    {
                                                                                        item.name
                                                                                    }
                                                                                </span>
                                                                            </span>
                                                                        ) : null;
                                                                    },
                                                                )}
                                                            </div>
                                                        )}
                                                        <Button
                                                            onClick={
                                                                handleSavePreferences
                                                            }
                                                            disabled={
                                                                isSavingPreferences
                                                            }
                                                            className="h-12 w-full shrink-0 gap-2 rounded-xl bg-stone-900 px-6 text-sm font-bold shadow-xl transition-transform hover:-translate-y-1 hover:bg-stone-800 sm:w-auto md:h-16 md:gap-3 md:rounded-2xl md:px-12 md:text-lg"
                                                        >
                                                            <Check className="h-4 w-4 md:h-6 md:w-6" />
                                                            {isSavingPreferences
                                                                ? 'Enregistrement...'
                                                                : 'Enregistrer mes choix'}
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            {selectedPreferredItems.length >
                                                0 && (
                                                <div className="rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4">
                                                    <p className="mb-3 text-xs font-bold tracking-[0.25em] text-primary/70 uppercase">
                                                        Vos choix enregistrés
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedPreferredItems.map(
                                                            (item) => (
                                                                <span
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm ring-1 ring-primary/10 md:text-sm"
                                                                >
                                                                    {item.emoji ||
                                                                        '•'}{' '}
                                                                    {item.name}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {savedSuccess && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50/80 p-3 text-xs font-bold text-green-700 shadow-sm md:gap-4 md:rounded-2xl md:p-5 md:text-base"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-green-600 md:h-6 md:w-6" />{' '}
                                                Vos préférences boissons ont été
                                                enregistrées avec succès.
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Footer */}
                            <div className="pt-10 pb-6 text-center opacity-40 md:pt-16">
                                <Flower2
                                    className="mx-auto mb-3 h-4 w-4 md:mb-5 md:h-6 md:w-6"
                                    style={{ color: accentColor }}
                                />
                                <p className="text-[10px] font-bold tracking-[0.4em] uppercase md:text-[11px]">
                                    {custom.footer}
                                </p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
