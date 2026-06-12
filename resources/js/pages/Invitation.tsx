import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Heart, MapPin, CalendarDays, Clock, GlassWater, Utensils, CheckCircle2, XCircle, Users, MailOpen, ChefHat, Check, Sparkles, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
          <Heart className="w-16 h-16 mx-auto text-primary/40 mb-6" />
          <h1 className="font-display text-2xl font-medium text-stone-800">Invitation introuvable</h1>
          <p className="text-stone-500 mt-3">Ce lien n'est pas valide ou a expiré.</p>
        </Card>
      </div>
    );
  }

  const isAttending = guest.status === 'attending';
  const isDeclined = guest.status === 'declined';

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
      context.fillText(wedding.title, canvas.width / 2, 55);
      context.font = '500 24px sans-serif';
      context.fillText(`${guest.first_name} ${guest.last_name}`, canvas.width / 2, 95);
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

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center overflow-x-hidden font-sans selection:bg-primary/20">
      
      {/* INITIAL ENVELOPE VIEW */}
      <AnimatePresence>
        {!showLetter && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md px-4"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div className="relative w-full max-w-[340px] md:max-w-md aspect-[4/3] cursor-pointer group perspective-1000" onClick={handleOpenEnvelope}>
              
              {/* Back of Envelope */}
              <div className="absolute inset-0 bg-stone-200 rounded-lg shadow-2xl overflow-hidden border border-stone-300">
                {/* Texture */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
              </div>

              {/* Letter peeking out */}
              <motion.div 
                className="absolute inset-x-4 top-4 bottom-4 bg-white rounded flex items-center justify-center shadow-inner border border-stone-100"
                initial={{ y: 0 }}
                animate={{ y: envelopeOpened ? -80 : 0, opacity: envelopeOpened ? 1 : 0.8 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              >
                <div className="text-center opacity-40">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-primary" fill="currentColor" />
                  <p className="font-display text-xs tracking-widest">{wedding.title}</p>
                </div>
              </motion.div>

              {/* Bottom Fold */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-stone-100 rounded-b-lg border-t border-stone-300 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] clip-bottom-fold z-20" 
                style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }} />

              {/* Left/Right Folds */}
              <div className="absolute inset-0 bg-stone-100/90 rounded-lg z-10 clip-side-folds border-stone-200"
                style={{ clipPath: 'polygon(0 0, 50% 50%, 100% 0, 100% 100%, 0 100%)' }} />

              {/* Top Flap */}
              <motion.div 
                className="absolute top-0 left-0 right-0 h-1/2 bg-stone-200 rounded-t-lg z-30 origin-top shadow-[0_5px_15px_rgba(0,0,0,0.1)] border-b border-stone-300"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: envelopeOpened ? 180 : 0, zIndex: envelopeOpened ? 0 : 30 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />

              {/* Seal */}
              <motion.div 
                className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-[#8B1E1E] shadow-lg flex items-center justify-center border-2 border-[#5a1111]"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: envelopeOpened ? 1.5 : 1, opacity: envelopeOpened ? 0 : 1 }}
                transition={{ duration: 0.4 }}
              >
                <MailOpen className="w-5 h-5 text-white/80" />
              </motion.div>

              {!envelopeOpened && (
                <p className="absolute -bottom-12 left-0 right-0 text-center text-white/90 text-sm tracking-widest font-medium uppercase animate-pulse">
                  Touchez pour ouvrir
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL LETTER VIEW */}
      {showLetter && (
        <motion.div 
          className="w-full max-w-2xl px-4 py-12 md:py-20 flex flex-col items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Card className="w-full bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-[2rem] overflow-hidden relative">
            
            {/* Elegant Background Texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <div className="p-8 md:p-14 space-y-12">
              
              {/* Header section */}
              <div className="text-center space-y-6">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-px bg-primary/30" />
                  <Heart className="w-5 h-5 text-primary mx-4" fill="currentColor" />
                  <div className="w-16 h-px bg-primary/30" />
                </div>
                
                <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Vous êtes cordialement invité(e)</p>
                <h1 className="font-display text-4xl md:text-6xl font-medium text-stone-800 tracking-tight">
                  {wedding.title}
                </h1>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-stone-600 font-medium">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary/70" />
                    <span>{format(new Date(wedding.date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  </div>
                  {wedding.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary/70" />
                      <span>{wedding.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personalized Greeting */}
              <div className="text-center max-w-lg mx-auto border-t border-b border-stone-100 py-8">
                <p className="text-xl text-stone-800 font-display mb-4">
                  Cher(e) <span className="text-primary italic">{guest.first_name} {guest.last_name}</span>,
                </p>
                <p className="text-stone-500 leading-relaxed text-sm md:text-base">
                  Nous serions honorés de partager ce moment inoubliable à vos côtés. Préparez-vous à vivre une journée remplie d'amour, de joie et de festivités !
                </p>
              </div>

              {/* Timeline Section */}
              {timeline.length > 0 && (
                <div className="bg-stone-50/50 rounded-3xl p-6 md:p-10 border border-stone-100">
                  <h3 className="font-display text-2xl text-center text-stone-800 mb-8 flex items-center justify-center gap-3">
                    <Clock className="w-6 h-6 text-primary/50" />
                    Programme des Festivités
                  </h3>
                  
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
                    {timeline.map((event, idx) => (
                      <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-stone-100 text-stone-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <span className="text-[10px] font-bold">{event.time.substring(0,5)}</span>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white border border-stone-100 shadow-sm text-left md:group-odd:text-right">
                          <h4 className="font-medium text-stone-800">{event.title}</h4>
                          {event.description && <p className="text-xs text-stone-500 mt-1">{event.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Info Section */}
              {table && (
                <div className="bg-stone-50/50 rounded-3xl p-6 md:p-10 border border-stone-100 text-center">
                  <h3 className="font-display text-2xl text-stone-800 mb-6 flex items-center justify-center gap-3">
                    <Utensils className="w-6 h-6 text-primary/50" />
                    Votre Table
                  </h3>
                  
                  <div className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary/5 border border-primary/20 text-primary font-medium text-lg mb-6 shadow-inner">
                    {table.name}
                  </div>
                  
                  {coGuests.length > 0 ? (
                     <div className="max-w-sm mx-auto">
                        <p className="text-sm text-stone-500 mb-3 flex items-center justify-center gap-2">
                           <Users className="w-4 h-4" />
                           Vous serez accompagné(e) de :
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {coGuests.map(cg => (
                            <span key={cg.id} className="text-xs font-medium px-3 py-1 bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm">
                              {cg.first_name} {cg.last_name}
                            </span>
                          ))}
                        </div>
                     </div>
                  ) : (
                    <p className="text-sm text-stone-500">Vous êtes le premier convive assigné à cette table !</p>
                  )}
                </div>
              )}

              <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6 text-center md:p-10">
                <QrCode className="mx-auto mb-3 h-7 w-7 text-primary" />
                <h3 className="font-display text-2xl text-stone-800">Votre code d’accès</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
                  Ce QR code est votre référence personnelle. Présentez-le à l’entrée pour être identifié rapidement.
                </p>
                <div id="guest-invitation-qr" className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4 shadow-md">
                  <QRCodeSVG value={invitationUrl} size={220} level="H" includeMargin />
                </div>
                <p className="mt-4 font-mono text-xs font-semibold tracking-wider text-stone-600">
                  RÉF. {inviteToken}
                </p>
                <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={downloadGuestQr}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger mon QR code
                </Button>
              </div>

              {/* Form Section */}
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-stone-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                
                <h3 className="font-display text-2xl text-stone-800 mb-6 flex items-center gap-3">
                  <GlassWater className="w-6 h-6 text-primary/50" />
                  Préférences & Confirmation
                </h3>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-stone-700">Vos préférences culinaires</Label>
                    <p className="text-xs text-stone-500">Aidez-nous à composer le menu parfait en choisissant vos plats favoris (jusqu'à 5).</p>
                    
                    <Dialog open={isMenuModalOpen} onOpenChange={setIsMenuModalOpen}>
                      <DialogTrigger asChild>
                        <button className={cn(
                          "w-full h-14 flex items-center gap-3 px-4 rounded-xl border-2 transition-all duration-300 group text-left",
                          menuPreferences.length > 0
                            ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                            : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100"
                        )}>
                          <ChefHat className={cn("w-5 h-5 shrink-0 transition-colors", menuPreferences.length > 0 ? "text-primary" : "text-stone-400 group-hover:text-stone-600")} />
                          <div className="flex-1 min-w-0">
                            {menuPreferences.length > 0 ? (
                              <span className="font-semibold text-primary text-sm">
                                {menuPreferences.length} plat{menuPreferences.length > 1 ? 's' : ''} sélectionné{menuPreferences.length > 1 ? 's' : ''} — Modifier
                              </span>
                            ) : (
                              <span className="text-stone-500 text-sm">Découvrir le menu et choisir mes préférences</span>
                            )}
                          </div>
                          {menuPreferences.length > 0 && (
                            <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-white">{menuPreferences.length}/{MAX_PREFERENCES}</span>
                          )}
                        </button>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl bg-stone-50 border-0 shadow-2xl p-0 overflow-hidden rounded-[2rem] max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-7 md:p-9 border-b border-stone-100 bg-white relative shrink-0">
                          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-bl-full pointer-events-none" />
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                              <ChefHat className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <DialogTitle className="font-display text-2xl text-stone-800">Notre Carte du Menu</DialogTitle>
                              <DialogDescription className="text-stone-500 mt-1">
                                Choisissez vos favoris parmi nos propositions
                              </DialogDescription>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-stone-500 font-medium">Mes sélections</span>
                              <span className={cn("text-xs font-bold", menuPreferences.length >= MAX_PREFERENCES ? "text-primary" : "text-stone-600")}>
                                {menuPreferences.length} / {MAX_PREFERENCES}
                              </span>
                            </div>
                            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                                animate={{ width: `${(menuPreferences.length / MAX_PREFERENCES) * 100}%` }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              />
                            </div>
                            {menuPreferences.length >= MAX_PREFERENCES && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                                <Sparkles className="w-3 h-3" />
                                Maximum atteint ! Vous pouvez déselectionner pour modifier.
                              </motion.p>
                            )}
                          </div>
                        </div>

                        {/* Scrollable content grouped by category */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                          {menuItems.length === 0 ? (
                            <div className="text-center py-12">
                              <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                              <p className="text-stone-500">Le menu n'est pas encore disponible.</p>
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
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="text-lg">{catMeta.emoji}</span>
                                    <h4 className="font-display text-lg text-stone-700">{catMeta.label}</h4>
                                    <div className="flex-1 h-px bg-stone-200" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(items as any[]).map(item => {
                                      const isSelected = menuPreferences.includes(item.id);
                                      const isDisabled = !isSelected && menuPreferences.length >= MAX_PREFERENCES;
                                      return (
                                        <motion.button
                                          key={item.id}
                                          type="button"
                                          whileHover={!isDisabled ? { scale: 1.02 } : {}}
                                          whileTap={!isDisabled ? { scale: 0.97 } : {}}
                                          onClick={() => (!isDisabled || isSelected) ? toggleMenuPreference(item.id) : undefined}
                                          className={cn(
                                            "relative w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-3 group",
                                            isSelected
                                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                                              : isDisabled
                                                ? "border-stone-100 bg-stone-100/60 opacity-50 cursor-not-allowed"
                                                : "border-transparent bg-white hover:border-stone-200 hover:shadow-sm"
                                          )}
                                        >
                                          <div className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all",
                                            isSelected ? "bg-primary/15 scale-110" : "bg-stone-50 group-hover:bg-stone-100"
                                          )}>
                                            {item.emoji || '🍽️'}
                                          </div>
                                          <div className="flex-1 min-w-0 pr-6">
                                            <p className={cn("font-semibold text-sm leading-tight", isSelected ? "text-primary" : "text-stone-800")}>
                                              {item.name}
                                            </p>
                                            {item.description && (
                                              <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                            )}
                                          </div>
                                          {/* Checkmark */}
                                          <div className={cn(
                                            "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                            isSelected
                                              ? "bg-primary border-primary shadow-sm scale-100"
                                              : "border-stone-200 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-60"
                                          )}>
                                            <Check className="w-3 h-3 text-white" />
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
                        <div className="shrink-0 p-6 md:p-8 bg-white border-t border-stone-100 flex flex-col sm:flex-row items-center gap-4">
                          {menuPreferences.length > 0 && (
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {menuPreferences.map(id => {
                                const item = menuItems.find(m => m.id === id);
                                return item ? (
                                  <span key={id} className="text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                    {item.emoji} {item.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                          <Button
                            onClick={() => setIsMenuModalOpen(false)}
                            className="shrink-0 w-full sm:w-auto rounded-xl px-8 h-12 bg-stone-900 hover:bg-stone-800 gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Confirmer mes choix
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {savedSuccess && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-green-50 text-green-700 text-sm rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Vos préférences ont été enregistrées.
                    </motion.div>
                  )}

                  <div className="pt-6 border-t border-stone-100">
                    <Label className="text-stone-700 mb-4 block text-center">Serez-vous présent(e) ?</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={() => handleRSVP('attending')}
                        disabled={isSubmitting}
                        className={cn(
                          "flex-1 h-14 rounded-xl text-base transition-all duration-300",
                          isAttending ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20" : "bg-stone-800 hover:bg-stone-900"
                        )}
                      >
                        {isAttending ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Heart className="w-5 h-5 mr-2" />}
                        {isAttending ? 'Présence confirmée' : 'Oui, je serai là !'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRSVP('declined')}
                        disabled={isSubmitting}
                        className={cn(
                          "flex-1 h-14 rounded-xl text-base border-2 transition-all duration-300",
                          isDeclined ? "border-red-200 bg-red-50 text-red-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {isDeclined ? <XCircle className="w-5 h-5 mr-2" /> : null}
                        {isDeclined ? 'Absence confirmée' : 'Désolé(e), je décline'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-8 opacity-60">
                <Heart className="w-4 h-4 mx-auto mb-2 text-primary" fill="currentColor" />
                <p className="text-xs tracking-widest uppercase">Merci et à très vite</p>
              </div>

            </div>
          </Card>
        </motion.div>
      )}

    </div>
  );
}
