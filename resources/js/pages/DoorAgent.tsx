import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WeddingSelector from '@/components/shared/WeddingSelector';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Search, CheckCircle2, XCircle, UserCheck, Users, AlertCircle, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function TableMap({ tables, highlightedTableId }) {
  if (!tables || tables.length === 0) return null;

  return (
    <div className="relative w-full aspect-[4/3] bg-stone-100 rounded-xl border border-stone-200 overflow-hidden shadow-inner mt-4">
      {/* Decorative entrance marker */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-stone-300 rounded-t-md" title="Entrée" />
      
      {tables.map((t, i) => {
        // Fallback grid positions if x/y are not set
        const hasPos = t.position_x > 0 || t.position_y > 0;
        const fallbackX = 15 + ((i % 3) * 35);
        const fallbackY = 15 + (Math.floor(i / 3) * 35);
        const x = hasPos ? t.position_x : fallbackX;
        const y = hasPos ? t.position_y : fallbackY;
        
        const isHighlighted = t.id === highlightedTableId;

        return (
          <div 
            key={t.id} 
            className={cn(
              "absolute flex flex-col items-center justify-center rounded-full shadow-sm transition-all duration-500", 
              isHighlighted 
                ? "bg-primary text-white scale-110 z-20 shadow-lg ring-4 ring-primary/30" 
                : "bg-white text-stone-600 border-2 border-stone-200 z-10 opacity-70",
              t.shape === 'rectangular' ? "rounded-md" : "rounded-full"
            )}
            style={{ 
              left: `${x}%`, 
              top: `${y}%`,
              width: '4rem',
              height: t.shape === 'rectangular' ? '3rem' : '4rem',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-xs font-bold px-1 text-center truncate w-full">{t.name}</span>
            {isHighlighted && <span className="text-[10px] opacity-80">Votre table</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function DoorAgent() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [scanResult, setScanResult] = useState(null); 
  const [showFullMap, setShowFullMap] = useState(false);

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activeWeddingId],
    queryFn: () => base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', activeWeddingId],
    queryFn: () => base44.entities.WeddingTable.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const markPresent = useMutation({
    mutationFn: (guestId) => base44.entities.Guest.update(guestId, { status: 'confirmed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] }),
  });

  const confirmed = guests.filter(g => g.status === 'confirmed');
  const total = guests.length;

  const handleCheck = (guest) => {
    if (guest.status === 'confirmed') {
      setScanResult({ guest, status: 'already' });
    } else if (guest.status === 'declined' || guest.status === 'absent') {
      setScanResult({ guest, status: 'error' });
    } else {
      setScanResult({ guest, status: 'ok' });
    }
    setSearch('');
  };

  const confirmEntry = async (guest) => {
    await markPresent.mutateAsync(guest.id);
    setScanResult({ guest: { ...guest, status: 'confirmed' }, status: 'done' });
  };

  const closeResult = () => setScanResult(null);

  const filtered = search.trim().length >= 2
    ? guests.filter(g => `${g.first_name} ${g.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      <div className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-display text-xl font-semibold text-stone-800">Contrôle d'entrée</h1>
            <p className="text-xs text-stone-500">Agent d'accueil</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFullMap(!showFullMap)}>
            <MapIcon className="w-4 h-4 mr-2 text-primary" />
            Plan de salle
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 mt-2">
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: total, icon: Users, color: 'text-stone-700' },
            { label: 'Entrés', value: confirmed.length, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Attente', value: total - confirmed.length, icon: AlertCircle, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="text-center p-3 border-stone-200 shadow-sm">
              <Icon className={cn("w-5 h-5 mx-auto mb-1", color)} />
              <div className={cn("text-xl font-bold", color)}>{value}</div>
              <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">{label}</div>
            </Card>
          ))}
        </div>

        {showFullMap && (
          <Card className="border-primary/20 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 pb-3">
              <CardTitle className="font-display text-lg text-primary flex justify-between items-center">
                Vue globale de la salle
                <Button variant="ghost" size="sm" onClick={() => setShowFullMap(false)}>Fermer</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-white">
              <TableMap tables={tables} highlightedTableId={null} />
            </CardContent>
          </Card>
        )}

        {/* Scan result Modal/View */}
        <AnimatePresence>
          {scanResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Card className={cn("border-2 p-5 shadow-xl relative overflow-hidden",
                scanResult.status === 'ok' ? "border-primary/40 bg-white" :
                scanResult.status === 'already' ? "border-blue-300 bg-blue-50" :
                scanResult.status === 'done' ? "border-green-400 bg-green-50" :
                "border-red-300 bg-red-50"
              )}>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 rounded-full hover:bg-stone-200/50" onClick={closeResult}>
                  <XCircle className="w-5 h-5 text-stone-400" />
                </Button>
                
                <div className="text-center space-y-3 mt-2">
                  {scanResult.status === 'ok' && (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                      <div className="font-display font-semibold text-2xl text-stone-800">{scanResult.guest.first_name} {scanResult.guest.last_name}</div>
                      <div className="text-sm text-stone-500 bg-stone-100 inline-block px-3 py-1 rounded-full">Invité trouvé</div>
                      <Button className="w-full h-12 mt-4 text-base" onClick={() => confirmEntry(scanResult.guest)}>
                        Valider l'entrée
                      </Button>
                    </>
                  )}
                  {scanResult.status === 'done' && (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <div className="font-display font-semibold text-2xl text-green-700">Bienvenue !</div>
                      <div className="text-stone-700 font-medium text-lg">{scanResult.guest.first_name} {scanResult.guest.last_name}</div>
                      
                      {scanResult.guest.table_id ? (
                        <div className="mt-6 pt-6 border-t border-green-200">
                          <p className="font-medium text-stone-700 mb-2">Orientez l'invité vers sa table :</p>
                          <TableMap tables={tables} highlightedTableId={scanResult.guest.table_id} />
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 mt-4 italic">Aucune table assignée pour le moment.</p>
                      )}
                      
                      <Button variant="outline" className="w-full mt-6" onClick={closeResult}>Invité suivant</Button>
                    </>
                  )}
                  {scanResult.status === 'already' && (
                    <>
                      <UserCheck className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                      <div className="font-display font-semibold text-xl text-blue-700">Déjà enregistré</div>
                      <div className="text-stone-600 font-medium">{scanResult.guest.first_name} {scanResult.guest.last_name} est déjà présent.</div>
                      
                      {scanResult.guest.table_id && (
                        <div className="mt-6 pt-4 border-t border-blue-200">
                          <TableMap tables={tables} highlightedTableId={scanResult.guest.table_id} />
                        </div>
                      )}
                    </>
                  )}
                  {scanResult.status === 'error' && (
                    <>
                      <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                      <div className="font-display font-semibold text-xl text-red-700">Accès refusé</div>
                      <div className="text-stone-600">{scanResult.guest.first_name} {scanResult.guest.last_name} — Statut : {scanResult.guest.status}</div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <Card className="border-stone-200 shadow-sm">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-2 text-stone-700">
              <Search className="w-5 h-5 text-primary" />
              <span className="font-medium">Rechercher un invité manuellement</span>
            </div>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Saisissez un nom ou prénom..."
              className="h-12 text-base bg-stone-50 border-stone-200"
            />
            {filtered.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filtered.map(g => (
                  <button key={g.id} onClick={() => handleCheck(g)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white border border-stone-200 hover:border-primary/50 hover:bg-stone-50 transition-all text-left shadow-sm">
                    <span className="font-medium text-stone-800">{g.first_name} {g.last_name}</span>
                    <StatusBadge status={g.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest list */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100">
            <CardTitle className="font-display text-lg text-stone-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary/70" />
              Liste des invités
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {guests.length === 0 ? (
              <div className="p-6 text-center text-stone-500 italic text-sm">Aucun invité trouvé pour ce mariage.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {guests.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                    <span className="text-sm font-medium text-stone-700">{g.first_name} {g.last_name}</span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={g.status} />
                      {g.status !== 'confirmed' && (
                        <Button variant="outline" size="sm" className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                          onClick={() => handleCheck(g)}>
                          Vérifier
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}