import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, MapPin, CalendarDays, Clock, GlassWater, Utensils, CheckCircle2, XCircle, Users, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';

const DRINK_OPTIONS = [
  { value: 'champagne', label: 'Champagne' },
  { value: 'wine_red', label: 'Vin Rouge' },
  { value: 'wine_white', label: 'Vin Blanc' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'beer', label: 'Bière' },
  { value: 'soft', label: 'Soft / Sans alcool' },
  { value: 'water', label: 'Eau gazeuse' },
];

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
  const [drinkPreference, setDrinkPreference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (!inviteToken) { setLoading(false); return; }
      
      const guests = await base44.entities.Guest.filter({ invitation_link: inviteToken });
      
      if (guests.length > 0) {
        const currentGuest = guests[0];
        setGuest(currentGuest);
        setDrinkPreference(currentGuest.drink_preference || '');

        const [allWeddings, allTimeline, allTables, tableGuests] = await Promise.all([
          base44.entities.Wedding.list(),
          base44.entities.TimelineEvent.filter({ wedding_id: currentGuest.wedding_id }),
          currentGuest.table_id ? base44.entities.WeddingTable.filter({ id: currentGuest.table_id }) : Promise.resolve([]),
          currentGuest.table_id ? base44.entities.Guest.filter({ table_id: currentGuest.table_id }) : Promise.resolve([]),
        ]);

        const w = allWeddings.find(w => w.id === currentGuest.wedding_id);
        if (w) setWedding(w);

        // Sort timeline
        setTimeline(allTimeline.sort((a, b) => a.time.localeCompare(b.time)));
        
        if (allTables.length > 0) setTable(allTables[0]);
        setCoGuests(tableGuests.filter(g => g.id !== currentGuest.id));
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
      await base44.entities.Guest.update(guest.id, {
        ...guest,
        status,
        drink_preference: drinkPreference,
      });
      setGuest({ ...guest, status, drink_preference: drinkPreference });
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

              {/* Form Section */}
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-stone-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                
                <h3 className="font-display text-2xl text-stone-800 mb-6 flex items-center gap-3">
                  <GlassWater className="w-6 h-6 text-primary/50" />
                  Préférences & Confirmation
                </h3>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-stone-700">Votre boisson de prédilection ?</Label>
                    <p className="text-xs text-stone-500">Cela nous aidera à ajuster les quantités pour le bar.</p>
                    <Select value={drinkPreference} onValueChange={setDrinkPreference}>
                      <SelectTrigger className="w-full h-12 bg-stone-50 rounded-xl border-stone-200 focus:ring-primary/30">
                        <SelectValue placeholder="Sélectionnez une boisson" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRINK_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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