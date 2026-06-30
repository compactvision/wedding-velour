import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Heart, MapPin, CalendarDays, Clock, GlassWater, Utensils, CheckCircle2, XCircle, Users, MailOpen, ChefHat, Check, Sparkles, Download, QrCode, Flower2, Leaf } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BrandLogo from '@/components/shared/BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  starter:  { label: 'Entrées',         emoji: '🥗' },
  main:     { label: 'Plats Principaux', emoji: '🍽️' },
  dessert:  { label: 'Desserts',         emoji: '🍰' },
  drink:    { label: 'Boissons',         emoji: '🥂' },
};

const MAX_PREFERENCES = 5;

const DEFAULT_INVITATION = {
  eyebrow: 'Vous êtes cordialement invité(e)',
  title: '',
  greeting: 'Cher(e) {guest}',
  body: "Nous serions honorés de partager ce moment inoubliable à vos côtés. Préparez-vous à vivre une journée remplie d'amour, de joie et de festivités !",
  rsvp_question: 'Serez-vous présent(e) ?',
  accept_label: 'Oui, je serai là !',
  decline_label: 'Désolé(e), je décline',
  footer: 'Merci et à très vite',
  background_image: '',
  accent_color: '#8B1E1E',
};

const Particle = ({ delay, color, isStar }: { delay: number, color: string, isStar?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, x: Math.random() * 100 - 50, rotate: 0, scale: 0 }}
      animate={{ 
        opacity: [0, isStar ? 1 : 0.4, 0], 
        y: [0, 500], 
        x: [0, Math.random() * 200 - 100],
        rotate: [0, Math.random() * 360],
        scale: [0, Math.random() * 1.5 + 0.5, 0]
      }}
      transition={{ 
        duration: 8 + Math.random() * 7, 
        repeat: Infinity, 
        delay, 
        ease: "linear" 
      }}
      className={cn(
        "absolute top-0 pointer-events-none",
        isStar ? "w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-3 h-4"
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
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (!inviteToken) { setLoading(false); return; }
      
      try {
        const invitation = await base44.public.invitation(inviteToken);
        const currentGuest = invitation.guest;
        setGuest(currentGuest);
        setMenuPreferences(currentGuest.menu_preferences || []);
        setWedding(invitation.wedding);
        setTimeline(invitation.timeline || []);
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
      const updatedGuest = await base44.public.respondToInvitation(inviteToken, {
        status,
        menu_preferences: menuPreferences,
      });
      setGuest(updatedGuest);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!guest || !wedding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <Card className="max-w-md w-full p-10 text-center shadow-2xl border-0 rounded-3xl">
          <BrandLogo variant="mark" className="mx-auto mb-6 h-28 w-28 opacity-70" />
          <h1 className="font-display text-2xl font-medium text-stone-800">Invitation introuvable</h1>
          <p className="text-stone-500 mt-3">Ce lien n'est pas valide ou a expiré.</p>
        </Card>
      </div>
    );
  }

  const isAttending = ['attending', 'confirmed'].includes(guest.status);
  const isDeclined = guest.status === 'declined';
  const custom = { ...DEFAULT_INVITATION, ...(wedding.invitation_custom || {}) };
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
  const formattedWeddingDate = format(new Date(wedding.date), 'EEEE d MMMM yyyy', { locale: fr });
  const greetingParts = custom.greeting.includes('{guest}')
    ? custom.greeting.split('{guest}')
    : [custom.greeting ? `${custom.greeting} ` : '', ''];

  const toggleMenuPreference = (itemId: string) => {
    setMenuPreferences(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, itemId];
    });
  };

  const invitationUrl = `${window.location.origin}/invitation?invite=${inviteToken}`;
  const drawWrappedText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
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

  const loadCanvasImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
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
      context.fillText(`${guest.first_name} ${guest.last_name}`, canvas.width / 2, 95);
      if (hasCompanions) {
        context.font = '600 18px sans-serif';
        context.fillStyle = accentColor;
        context.fillText(`Pass valable pour ${partyLabel}`, canvas.width / 2, 122);
      }
      context.drawImage(image, 110, 130, 500, 500);
      context.font = '500 20px monospace';
      context.fillText(`Référence : ${inviteToken}`, canvas.width / 2, 690);
      context.font = '18px sans-serif';
      context.fillStyle = '#78716c';
      context.fillText('Présentez ce code à l’agent d’accueil', canvas.width / 2, 735);
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
    canvas.height = 2600; 
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
        ctx.drawImage(bg, archX + archW/2 - imgW/2, archY + archH/2 - imgH/2, imgW, imgH);
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
    currentY = drawWrappedText(ctx, invitationTitle, 540, currentY, 850, 90);
    currentY += 80;
    
    // Date & Venue
    ctx.fillStyle = '#57534e';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(formattedWeddingDate.toUpperCase(), 540, currentY);
    currentY += 50;
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
    ctx.fillText(custom.greeting.replace('{guest}', guestName), 540, currentY);
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
      ctx.fillText(`Ce carton est réservé pour ${partyLabel}.`, 540, currentY + 78);
      currentY += 170;
    } else {
      currentY += 40;
    }

    // QR Code Box
    const qrImage = await loadCanvasImage(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))))}`);
    const qrSize = 300;
    
    // Draw fancy box for QR
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(540 - qrSize/2 - 25, currentY - 25, qrSize + 50, qrSize + 50, 40);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(qrImage, 540 - qrSize/2, currentY, qrSize, qrSize);
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
    <div className="min-h-screen bg-[#fdf8ef] flex flex-col items-center overflow-x-hidden font-sans selection:bg-primary/20">
      
      {/* INITIAL ENVELOPE VIEW */}
      <AnimatePresence>
        {!showLetter && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#15110f] px-4 py-8"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {custom.background_image && (
              <img src={custom.background_image} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 blur-lg scale-110" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_50%),linear-gradient(180deg,rgba(21,17,15,0.5),rgba(21,17,15,0.98))]" />

            <motion.button
              type="button"
              onClick={handleOpenEnvelope}
              className="group relative w-full max-w-[360px] overflow-hidden rounded-[2.5rem] bg-[#fdfbf7] text-left shadow-[0_50px_150px_rgba(0,0,0,0.65)] outline-none ring-1 ring-white/20 transition-transform duration-700 hover:-translate-y-3 focus-visible:ring-4 focus-visible:ring-white/55 md:max-w-[480px]"
              initial={{ y: 40, opacity: 0, rotateX: -10 }}
              animate={{ y: 0, opacity: 1, rotateX: envelopeOpened ? 12 : 0, scale: envelopeOpened ? 0.92 : 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              {/* Envelope Inner Styling */}
              <div className="absolute inset-2 z-20 rounded-[2rem] border-[1.5px] border-stone-200/60 shadow-[inset_0_0_20px_rgba(0,0,0,0.04)]" />
              <div className="absolute inset-4 z-20 rounded-[1.5rem] border border-stone-200/40" />
              
              <div className="absolute left-6 md:left-8 top-6 md:top-8 z-30 h-16 w-16 md:h-24 md:w-24 rounded-tl-[1.8rem] border-l-2 border-t-2 opacity-60" style={{ borderColor: accentColor }} />
              <div className="absolute right-6 md:right-8 top-6 md:top-8 z-30 h-16 w-16 md:h-24 md:w-24 rounded-tr-[1.8rem] border-r-2 border-t-2 opacity-60" style={{ borderColor: accentColor }} />
              <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-30 h-16 w-16 md:h-24 md:w-24 rounded-bl-[1.8rem] border-b-2 border-l-2 opacity-60" style={{ borderColor: accentColor }} />
              <div className="absolute bottom-6 md:bottom-8 right-6 md:right-8 z-30 h-16 w-16 md:h-24 md:w-24 rounded-br-[1.8rem] border-b-2 border-r-2 opacity-60" style={{ borderColor: accentColor }} />

              <div className="relative h-[250px] overflow-hidden md:h-[350px] rounded-t-[2.5rem]">
                {custom.background_image ? (
                  <img src={custom.background_image} alt="" className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#f7d9cf,transparent_28%),radial-gradient(circle_at_78%_18%,#d8bda7,transparent_26%),linear-gradient(135deg,#7c2d2d,#f5efe6_60%,#315244)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#fdfbf7]" />
                <div className="absolute inset-x-8 md:inset-x-12 bottom-8 md:bottom-12 z-20 flex items-center justify-center gap-4 text-white drop-shadow-lg">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white/90" />
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/90 to-transparent" />
                </div>
              </div>

              <div className="relative z-30 px-6 pb-12 pt-8 text-center md:px-12 md:pb-16 md:pt-10">
                <div className="mx-auto mb-4 md:mb-6 flex max-w-[280px] items-center justify-center gap-3 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.4em] md:tracking-[0.5em]" style={{ color: accentColor }}>
                  <span className="h-px flex-1 bg-current opacity-50" />
                  Save the date
                  <span className="h-px flex-1 bg-current opacity-50" />
                </div>
                <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] md:tracking-[0.35em] text-stone-400">{custom.eyebrow}</p>
                <h1 className="mt-4 md:mt-6 font-display text-4xl font-medium leading-[1.1] text-stone-800 md:text-6xl drop-shadow-sm">
                  {invitationTitle}
                </h1>
                {hasCompanions && (
                  <div className="mx-auto mt-5 md:mt-7 inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500 shadow-sm backdrop-blur md:px-5 md:py-2.5 md:text-[11px]">
                    <Users className="h-3.5 w-3.5" style={{ color: accentColor }} />
                    {partyLabel} attendues
                  </div>
                )}
                <div className="mx-auto mt-6 md:mt-8 h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-stone-400 to-transparent" />
                
                <p className="mt-6 md:mt-8 text-[11px] md:text-sm font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-stone-600">
                  {formattedWeddingDate}
                </p>
                
                {/* Beautiful Wax Seal Element */}
                <div className="mt-8 md:mt-10 flex flex-col items-center justify-center">
                  <div 
                    className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.4),inset_0_-4px_10px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] relative"
                    style={{ backgroundColor: accentColor }}
                  >
                    <div className="absolute inset-[3px] rounded-full border border-white/20" />
                    <div className="absolute inset-[5px] rounded-full border border-black/15 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)]" />
                    <Heart className="h-6 w-6 md:h-8 md:w-8 text-white/90 drop-shadow-md" fill="currentColor" />
                  </div>
                  <p className="mt-5 md:mt-6 text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-stone-400 font-bold group-hover:text-stone-700 transition-colors">
                    Briser le sceau
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
          className="w-full max-w-[900px] px-4 py-8 md:py-16 lg:py-24 flex flex-col items-center"
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="w-full bg-white/95 backdrop-blur-xl border-0 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] rounded-[2.5rem] md:rounded-[4.5rem] overflow-hidden relative">
            
            {/* Elegant Background Texture & Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 md:h-[500px] md:w-[500px] -translate-y-10 translate-x-10 md:-translate-y-20 md:translate-x-20 rounded-full opacity-[0.12] blur-3xl" style={{ backgroundColor: accentColor }} />
            <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 md:h-[500px] md:w-[500px] -translate-x-10 translate-y-10 md:-translate-x-20 md:translate-y-20 rounded-full bg-stone-300/40 blur-3xl" />
            
            {/* Animated Petals Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Particle key={`petal-${i}`} delay={i * 1.5} color={accentColor} />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <Particle key={`star-${i}`} delay={i * 2.1} color={accentColor} isStar />
              ))}
            </div>

            <div className="pointer-events-none absolute top-0 left-0 right-0 h-1.5 md:h-2.5" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1.5 md:h-2.5" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            <div className="pointer-events-none absolute top-0 left-0 bottom-0 w-1.5 md:w-2.5" style={{ background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)` }} />
            <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-1.5 md:w-2.5" style={{ background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)` }} />


            <div className="relative z-10 p-6 md:p-14 lg:p-24 space-y-14 md:space-y-20">
              
              {/* Header section */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="text-center space-y-6 md:space-y-8 relative"
              >
                
                {custom.background_image && (
                  <div className="relative mb-14 md:mb-20 mx-auto max-w-xs md:max-w-xl mt-4 group">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 40 }} 
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                      className="relative p-2 md:p-4 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] rounded-t-[10rem] md:rounded-t-[14rem] border border-stone-100"
                    >
                      <div className="relative overflow-hidden rounded-t-[9.5rem] md:rounded-t-[13.5rem] border-[4px] md:border-[8px] border-white bg-stone-100 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)]">
                        <img src={custom.background_image} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-105" />
                        
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-900/70 via-stone-900/5 to-transparent z-10" />
                        
                        {/* Shimmer sweep */}
                        <motion.div 
                          initial={{ x: '-100%', y: '-100%', opacity: 0 }}
                          animate={{ x: '100%', y: '100%', opacity: [0, 0.4, 0] }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", repeatDelay: 1.5 }}
                          className="absolute inset-0 z-10 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/40 to-transparent rotate-45 pointer-events-none"
                        />
                        
                        {/* Inner elegant line */}
                        <div className="absolute inset-2 md:inset-4 border border-white/40 rounded-t-[9.5rem] md:rounded-t-[13.5rem] z-20 pointer-events-none" />
                        
                        <div className="pointer-events-none absolute bottom-6 md:bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-3 text-white z-20">
                          <div className="flex items-center gap-4 md:gap-8 w-full px-10 md:px-20">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                            <Flower2 className="h-5 w-5 md:h-7 md:w-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/90 to-transparent" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Floral Decorations outside the frame */}
                      <motion.div 
                        initial={{ opacity: 0, rotate: -45, scale: 0 }}
                        animate={{ opacity: 1, rotate: -15, scale: 1 }}
                        transition={{ delay: 1.4, duration: 1.2 }}
                        className="absolute -bottom-6 -left-6 md:-bottom-10 md:-left-10 text-stone-200 drop-shadow-xl" style={{ color: accentColor }}
                      >
                        <Leaf className="w-12 h-12 md:w-20 md:h-20 opacity-60" />
                      </motion.div>
                      <motion.div 
                        initial={{ opacity: 0, rotate: 45, scale: 0 }}
                        animate={{ opacity: 1, rotate: 15, scale: 1 }}
                        transition={{ delay: 1.6, duration: 1.2 }}
                        className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 text-stone-200 drop-shadow-xl" style={{ color: accentColor }}
                      >
                        <Leaf className="w-12 h-12 md:w-20 md:h-20 opacity-60 transform scale-x-[-1]" />
                      </motion.div>
                    </motion.div>
                  </div>
                )}

                <div className="flex justify-center items-center gap-4 mb-6 md:mb-12">
                  <div className="w-12 md:w-24 h-[1px] bg-gradient-to-r from-transparent to-primary/50" />
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-primary/60" />
                  <Heart className="w-5 h-5 md:w-7 md:h-7 mx-2 md:mx-4" style={{ color: accentColor }} fill="currentColor" />
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-primary/60" />
                  <div className="w-12 md:w-24 h-[1px] bg-gradient-to-l from-transparent to-primary/50" />
                </div>
                
                <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em] md:tracking-[0.4em] text-stone-400 mb-4 md:mb-6">{custom.eyebrow}</p>
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium text-stone-800 tracking-tight leading-[1.1] md:leading-[1.1]">
                  <span className="bg-gradient-to-r from-stone-800 via-stone-600 to-stone-800 text-transparent bg-clip-text">
                    {custom.title || wedding.title}
                  </span>
                </h1>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 mt-10 md:mt-14 text-stone-600 font-medium">
                  <div className="flex items-center gap-3 bg-stone-50/80 px-6 md:px-8 py-3 md:py-4 rounded-full border border-stone-100 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] text-sm md:text-base transition-transform hover:-translate-y-1">
                    <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-primary/80" />
                    <span className="tracking-wide uppercase text-xs md:text-sm">{format(new Date(wedding.date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  </div>
                  {wedding.venue && (
                    <div className="flex items-center gap-3 bg-stone-50/80 px-6 md:px-8 py-3 md:py-4 rounded-full border border-stone-100 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] text-sm md:text-base transition-transform hover:-translate-y-1">
                      <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary/80" />
                      <span className="tracking-wide uppercase text-xs md:text-sm">{wedding.venue}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Personalized Greeting */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1 }}
                className="text-center max-w-3xl mx-auto py-10 md:py-16 relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 md:w-48 h-[1px] bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 md:w-48 h-[1px] bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                
                <p className="text-2xl sm:text-3xl md:text-4xl text-stone-800 font-display mb-6 md:mb-10 leading-normal">
                  {greetingParts[0]}<span className="italic" style={{ color: accentColor }}>{guestName}</span>{greetingParts[1]}
                </p>
                <p className="text-stone-500 leading-relaxed md:leading-loose text-sm sm:text-base md:text-lg font-light">
                  {custom.body}
                </p>
                {hasCompanions && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-[1.75rem] border border-stone-100 bg-gradient-to-br from-white via-stone-50/80 to-white p-1 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.28)] md:mt-10"
                  >
                    <div className="relative rounded-[1.45rem] px-6 py-6 md:px-10 md:py-7">
                      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                      <div className="mb-4 flex items-center justify-center gap-3">
                        <span className="h-px w-10 bg-stone-200" />
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-100" style={{ color: accentColor }}>
                          <Users className="h-5 w-5" />
                        </span>
                        <span className="h-px w-10 bg-stone-200" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">Votre douce compagnie</p>
                      <p className="mt-3 text-sm font-light leading-relaxed text-stone-600 md:text-base">
                        {companionLine} Nous avons préparé votre accueil pour <span className="font-semibold" style={{ color: accentColor }}>{partyLabel}</span>.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* RSVP Form */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1 }}
                className="rounded-[2rem] md:rounded-[3rem] bg-white p-6 sm:p-8 md:p-16 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] relative overflow-hidden border border-stone-100/60 max-w-4xl mx-auto group"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 md:h-2" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
                
                <Label className="mb-6 md:mb-10 block text-center text-xs md:text-sm font-bold uppercase tracking-widest text-stone-400">{custom.rsvp_question}</Label>
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 px-2 md:px-8">
                  <Button
                    onClick={() => handleRSVP('attending')}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 h-14 md:h-20 rounded-xl md:rounded-[1.5rem] text-sm md:text-lg font-medium transition-all duration-500 relative overflow-hidden",
                      isAttending 
                        ? "bg-green-600 hover:bg-green-700 shadow-[0_15px_30px_rgba(22,163,74,0.3)] text-white scale-[1.02]" 
                        : "bg-stone-900 hover:bg-stone-800 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] text-white hover:-translate-y-1"
                    )}
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isAttending ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" /> : <Heart className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />}
                    {isAttending ? 'Présence confirmée' : custom.accept_label}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRSVP('declined')}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 h-14 md:h-20 rounded-xl md:rounded-[1.5rem] text-sm md:text-lg font-medium border-2 transition-all duration-500",
                      isDeclined ? "border-red-200 bg-red-50 text-red-600 scale-[1.02]" : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800 hover:-translate-y-1"
                    )}
                  >
                    {isDeclined ? <XCircle className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" /> : null}
                    {isDeclined ? 'Absence confirmée' : custom.decline_label}
                  </Button>
                </div>
                {!isAttending && !isDeclined && (
                  <p className="mx-auto mt-6 md:mt-8 max-w-md text-xs md:text-sm text-stone-400 font-light leading-relaxed">
                    Le programme, votre table et votre code d’accès apparaîtront dès que votre présence sera confirmée.
                    {hasCompanions ? ` Cette réponse comptera pour ${partyLabel}.` : ''}
                  </p>
                )}
                {isDeclined && (
                  <p className="mx-auto mt-6 md:mt-8 max-w-md text-xs md:text-sm text-stone-400 font-light leading-relaxed">
                    Merci pour votre réponse. Nous garderons une pensée pour vous pendant la célébration.
                  </p>
                )}
              </motion.div>

              {/* Timeline Section */}
              {isAttending && timeline.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 1 }}
                  className="bg-stone-50/80 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-16 border border-stone-100/50 max-w-5xl mx-auto shadow-sm"
                >
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 md:mb-6 text-primary">
                      <Clock className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <h3 className="font-display text-3xl md:text-4xl text-center text-stone-800">
                      Programme des Festivités
                    </h3>
                  </div>
                  
                  <div className="space-y-8 md:space-y-12 relative before:absolute before:inset-0 before:ml-5 md:before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-stone-300 before:to-transparent">
                    {timeline.map((event, idx) => (
                      <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-[4px] border-white bg-stone-100 text-stone-500 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform duration-500 group-hover:scale-125 group-hover:bg-primary group-hover:text-white group-hover:border-primary/20 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                          <span className="text-[10px] md:text-[11px] font-bold tracking-widest">{event.time.substring(0,5)}</span>
                        </div>
                        <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-4rem)] p-5 md:p-8 rounded-2xl md:rounded-[2rem] bg-white border border-stone-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] text-left md:group-odd:text-right transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-2 group-hover:border-stone-200">
                          {event.image_url && (
                            <div className="overflow-hidden rounded-xl md:rounded-2xl mb-4 md:mb-6">
                              <img src={event.image_url} alt="" className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                          )}
                          <h4 className="font-display text-xl md:text-2xl text-stone-800 mb-2 md:mb-3">{event.title}</h4>
                          {event.description && <p className="text-sm md:text-base text-stone-500 font-light leading-relaxed">{event.description}</p>}
                          {event.sub_details?.length > 0 && (
                            <div className="mt-4 md:mt-6 space-y-2">
                              {event.sub_details.map((detail, index) => (
                                <div key={`${event.id}-${index}`} className="inline-block md:block rounded-xl bg-stone-50 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-stone-600 border border-stone-100 mr-2 md:mr-0 last:mr-0">
                                  {detail}
                                </div>
                              ))}
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
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 1 }}
                  className="bg-stone-50/80 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-16 border border-stone-100/50 text-center max-w-4xl mx-auto relative overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 md:w-80 md:h-80 bg-primary/5 rounded-bl-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 md:w-80 md:h-80 bg-primary/5 rounded-tr-full pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center mb-4 md:mb-6 text-primary">
                      <Utensils className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <h3 className="font-display text-2xl md:text-4xl text-stone-800 mb-6 md:mb-10">
                      Votre Table
                    </h3>
                    
                    <div className="inline-flex items-center justify-center px-8 md:px-14 py-4 md:py-6 rounded-full bg-white border border-primary/20 text-primary font-bold text-xl md:text-3xl mb-8 md:mb-12 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] transition-transform hover:scale-105">
                      {table.name}
                    </div>
                    
                    {coGuests.length > 0 ? (
                       <div className="max-w-xl mx-auto">
                          <div className="flex items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                            <div className="h-px flex-1 bg-stone-200" />
                            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-stone-400 font-bold flex items-center gap-2">
                               <Users className="w-3 h-3 md:w-4 md:h-4" />
                               Vous serez accompagné(e) de
                            </p>
                            <div className="h-px flex-1 bg-stone-200" />
                          </div>
                          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                            {coGuests.map(cg => (
                              <span key={cg.id} className="text-xs md:text-sm font-medium px-5 md:px-6 py-2.5 md:py-3 bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
                                {cg.first_name} {cg.last_name}
                              </span>
                            ))}
                          </div>
                       </div>
                    ) : (
                      <p className="text-xs md:text-sm text-stone-400 font-light">Vous êtes le premier convive assigné à cette table !</p>
                    )}
                  </div>
                </motion.div>
              )}

              {isAttending && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1 }}
                className="rounded-[2rem] md:rounded-[3rem] border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent p-6 sm:p-8 md:p-16 text-center max-w-4xl mx-auto shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="w-12 h-12 md:w-20 md:h-20 mx-auto rounded-xl md:rounded-3xl bg-white shadow-md flex items-center justify-center mb-6 md:mb-8 text-primary">
                  <QrCode className="h-6 w-6 md:h-10 md:w-10" />
                </div>
                <h3 className="font-display text-2xl md:text-4xl text-stone-800">Votre passe d'accès</h3>
                <p className="mx-auto mt-4 md:mt-6 max-w-xl text-sm md:text-base text-stone-500 font-light leading-relaxed">
                  Ce QR code est votre invitation personnelle. Présentez-le à l’entrée pour accéder aux festivités.
                </p>
                {hasCompanions && (
                  <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-primary/10 bg-white/75 px-5 py-4 text-sm font-medium text-stone-600 shadow-sm">
                    <Users className="h-5 w-5 shrink-0 text-primary" />
                    <span>Ce pass couvre votre arrivée en groupe: {partyLabel} au total.</span>
                  </div>
                )}
                <div id="guest-invitation-qr" className="mx-auto mt-8 md:mt-12 w-fit rounded-[1.5rem] md:rounded-[2.5rem] bg-white p-5 md:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 duration-500">
                  <QRCodeSVG value={invitationUrl} size={220} level="H" includeMargin />
                </div>
                <p className="mt-6 md:mt-8 font-mono text-xs md:text-sm font-bold tracking-[0.3em] text-stone-400">
                  RÉF. {inviteToken}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 mt-10 md:mt-12">
                  <Button type="button" variant="outline" className="rounded-xl md:rounded-2xl h-14 md:h-16 px-6 md:px-10 border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 text-sm md:text-base font-bold transition-all" onClick={downloadGuestQr}>
                    <Download className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                    Sauvegarder le pass
                  </Button>
                  <Button type="button" className="rounded-xl md:rounded-2xl h-14 md:h-16 px-6 md:px-10 bg-stone-900 hover:bg-stone-800 text-white shadow-xl text-sm md:text-base font-bold transition-transform hover:-translate-y-1" onClick={downloadInvitationCard}>
                    <Download className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
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
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1 }}
                className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-16 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.1)] border border-stone-100 relative overflow-hidden max-w-5xl mx-auto"
              >
                <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}20)` }} />
                
                <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-10">
                  <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <GlassWater className="w-5 h-5 md:w-8 md:h-8" />
                  </div>
                  <h3 className="font-display text-2xl md:text-4xl text-stone-800">
                    Préférences Culinaires
                  </h3>
                </div>

                <div className="space-y-6 md:space-y-10 pl-2 md:pl-4">
                  <div className="space-y-4 md:space-y-6">
                    <p className="text-sm md:text-base text-stone-500 font-light leading-relaxed max-w-2xl">Aidez-nous à composer le menu parfait en choisissant vos plats favoris (jusqu'à 5).</p>
                    
                    <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
                      <DialogTrigger asChild>
                        <button className={cn(
                          "w-full h-16 md:h-24 flex items-center gap-4 md:gap-6 px-5 md:px-8 rounded-xl md:rounded-[2rem] border-2 transition-all duration-300 group text-left",
                          menuPreferences.length > 0
                            ? "border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-md hover:shadow-lg"
                            : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white shadow-sm hover:shadow-md"
                        )}>
                          <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm", menuPreferences.length > 0 ? "bg-primary text-white" : "bg-white text-stone-400 group-hover:text-stone-600")}>
                            <ChefHat className="w-5 h-5 md:w-7 md:h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {menuPreferences.length > 0 ? (
                              <div>
                                <span className="font-bold text-primary text-sm md:text-lg block mb-0.5 md:mb-1">
                                  {menuPreferences.length} plat{menuPreferences.length > 1 ? 's' : ''} sélectionné{menuPreferences.length > 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] md:text-xs text-primary/70 font-medium tracking-wide uppercase">Cliquez pour modifier vos choix</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-stone-700 font-bold text-sm md:text-lg block mb-0.5 md:mb-1">Découvrir le menu</span>
                                <span className="text-[10px] md:text-xs text-stone-500 font-light">Choisir vos préférences culinaires</span>
                              </div>
                            )}
                          </div>
                          {menuPreferences.length > 0 && (
                            <span className="shrink-0 text-xs md:text-sm font-bold px-3 md:px-5 py-1 md:py-2 rounded-full bg-white border border-primary/20 text-primary shadow-sm">{menuPreferences.length}/{MAX_PREFERENCES}</span>
                          )}
                        </button>
                      </DialogTrigger>

                      <DialogContent className="max-w-4xl bg-stone-50 border-0 shadow-2xl p-0 overflow-hidden rounded-[2rem] md:rounded-[3rem] max-h-[90vh] flex flex-col w-[95vw] md:w-full">
                        {/* Header */}
                        <div className="p-6 md:p-12 border-b border-stone-100 bg-white relative shrink-0">
                          <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-bl-full pointer-events-none" />
                          <div className="flex items-start gap-4 md:gap-6">
                            <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                              <ChefHat className="w-6 h-6 md:w-10 md:h-10 text-primary" />
                            </div>
                            <div>
                              <DialogTitle className="font-display text-2xl md:text-4xl text-stone-800">Notre Carte</DialogTitle>
                              <DialogDescription className="text-stone-500 mt-2 md:mt-3 text-sm md:text-base font-light">
                                Choisissez vos favoris parmi nos propositions
                              </DialogDescription>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-6 md:mt-10">
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                              <span className="text-xs md:text-sm text-stone-500 font-bold uppercase tracking-widest">Mes sélections</span>
                              <span className={cn("text-xs md:text-sm font-bold", menuPreferences.length >= MAX_PREFERENCES ? "text-primary" : "text-stone-600")}>
                                {menuPreferences.length} / {MAX_PREFERENCES}
                              </span>
                            </div>
                            <div className="h-2 md:h-3 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                                animate={{ width: `${(menuPreferences.length / MAX_PREFERENCES) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              />
                            </div>
                            {menuPreferences.length >= MAX_PREFERENCES && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 md:gap-2 mt-3 md:mt-4 text-xs md:text-sm text-primary font-bold">
                                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                                Maximum atteint ! Vous pouvez déselectionner pour modifier.
                              </motion.p>
                            )}
                          </div>
                        </div>

                        {/* Scrollable content grouped by category */}
                        <div className="flex-1 overflow-y-auto p-5 md:p-12 space-y-10 md:space-y-16">
                          {menuItems.length === 0 ? (
                            <div className="text-center py-12 md:py-24">
                              <Utensils className="w-12 h-12 md:w-20 md:h-20 text-stone-200 mx-auto mb-4 md:mb-8" />
                              <p className="text-base md:text-xl text-stone-400 font-light">Le menu n'est pas encore disponible.</p>
                            </div>
                          ) : (
                            Object.entries(
                              menuItems.reduce((acc: Record<string, any[]>, item) => {
                                const cat = item.category || 'other';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(item);
                                return acc;
                              }, {})
                            ).map(([category, items]) => {
                              const catMeta = CATEGORY_LABELS[category] || { label: category, emoji: '🍴' };
                              return (
                                <div key={category}>
                                  <div className="flex items-center gap-3 md:gap-5 mb-5 md:mb-8">
                                    <span className="text-xl md:text-3xl">{catMeta.emoji}</span>
                                    <h4 className="font-display text-xl md:text-3xl text-stone-700">{catMeta.label}</h4>
                                    <div className="flex-1 h-[2px] bg-stone-100" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                                    {(items as any[]).map(item => {
                                      const isSelected = menuPreferences.includes(item.id);
                                      const isDisabled = !isSelected && menuPreferences.length >= MAX_PREFERENCES;
                                      return (
                                        <motion.button
                                          key={item.id}
                                          type="button"
                                          whileHover={!isDisabled ? { scale: 1.02 } : {}}
                                          whileTap={!isDisabled ? { scale: 0.98 } : {}}
                                          onClick={() => (!isDisabled || isSelected) ? toggleMenuPreference(item.id) : undefined}
                                          className={cn(
                                            "relative w-full p-4 md:p-6 rounded-xl md:rounded-[2rem] border-2 transition-all duration-300 text-left flex items-start gap-3 md:gap-5 group",
                                            isSelected
                                              ? "border-primary bg-primary/5 shadow-[0_10px_20px_rgba(0,0,0,0.05)]"
                                              : isDisabled
                                                ? "border-stone-100 bg-stone-100/60 opacity-50 cursor-not-allowed"
                                                : "border-transparent bg-white hover:border-stone-200 hover:shadow-md"
                                          )}
                                        >
                                          <div className={cn(
                                            "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl shrink-0 transition-all duration-300 shadow-sm",
                                            isSelected ? "bg-white scale-110" : "bg-stone-50 group-hover:bg-white group-hover:scale-105"
                                          )}>
                                            {item.emoji || '🍽️'}
                                          </div>
                                          <div className="flex-1 min-w-0 pr-6 md:pr-10">
                                            <p className={cn("font-bold text-sm md:text-lg leading-tight mb-1 md:mb-2", isSelected ? "text-primary" : "text-stone-800")}>
                                              {item.name}
                                            </p>
                                            {item.description && (
                                              <p className="text-xs md:text-sm text-stone-500 line-clamp-2 leading-relaxed font-light">{item.description}</p>
                                            )}
                                          </div>
                                          {/* Checkmark */}
                                          <div className={cn(
                                            "absolute top-4 md:top-6 right-4 md:right-6 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                            isSelected
                                              ? "bg-primary border-primary shadow-md scale-100"
                                              : "border-stone-200 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-hover:bg-stone-50"
                                          )}>
                                            <Check className={cn("w-3 h-3 md:w-5 md:h-5 transition-colors", isSelected ? "text-white" : "text-stone-300")} />
                                          </div>
                                        </motion.button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-5 md:p-10 bg-white border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4 md:gap-8 shadow-[0_-10px_50px_rgba(0,0,0,0.05)] relative z-10">
                          {menuPreferences.length > 0 && (
                            <div className="flex-1 flex flex-wrap gap-1.5 md:gap-3">
                              {menuPreferences.map(id => {
                                const item = menuItems.find(m => m.id === id);
                                return item ? (
                                  <span key={id} className="text-xs md:text-sm bg-primary/10 text-primary font-bold px-3 md:px-5 py-1.5 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-2 border border-primary/10 shadow-sm">
                                    {item.emoji} <span className="hidden sm:inline">{item.name}</span>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                          <Button
                            onClick={() => setIsMenuModalOpen(false)}
                            className="shrink-0 w-full sm:w-auto rounded-xl md:rounded-2xl px-8 md:px-12 h-12 md:h-16 bg-stone-900 hover:bg-stone-800 gap-2 md:gap-3 text-sm md:text-lg font-bold shadow-xl transition-transform hover:-translate-y-1"
                          >
                            <Check className="w-4 h-4 md:w-6 md:h-6" />
                            Valider mes choix
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {savedSuccess && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 md:p-5 bg-green-50/80 border border-green-100 text-green-700 text-xs md:text-base font-bold rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-4 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-green-600" /> Vos préférences ont été enregistrées avec succès.
                    </motion.div>
                  )}

                </div>
              </motion.div>
              )}

              {/* Footer */}
              <div className="text-center pt-10 md:pt-16 pb-6 opacity-40">
                <Flower2 className="w-4 h-4 md:w-6 md:h-6 mx-auto mb-3 md:mb-5" style={{ color: accentColor }} />
                <p className="text-[10px] md:text-[11px] font-bold tracking-[0.4em] uppercase">{custom.footer}</p>
              </div>

            </div>
          </Card>
        </motion.div>
      )}

    </div>
  );
}
