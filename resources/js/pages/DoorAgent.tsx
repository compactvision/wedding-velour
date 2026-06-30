import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WeddingSelector from '@/components/shared/WeddingSelector';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, CheckCircle2, XCircle, UserCheck, Users, AlertCircle, Map as MapIcon, Camera, CameraOff, ImageUp, LogOut, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@inertiajs/react';
import OfflineStatus from '@/components/shared/OfflineStatus';
import BrandLogo from '@/components/shared/BrandLogo';

function TableMap({ tables, highlightedTableId, weddingId }) {
  if (!tables || tables.length === 0) return null;

  let roomPolygon = [];
  try {
    roomPolygon = JSON.parse(localStorage.getItem(`room_polygon_${weddingId}`) || '[]');
  } catch {
    roomPolygon = [];
  }

  return (
    <div className="mt-4 overflow-auto rounded-2xl border border-stone-200 bg-slate-50 shadow-inner">
      <svg viewBox="0 0 700 500" className="min-h-[420px] w-full min-w-[700px]" aria-label="Plan de la salle">
        <defs>
          <pattern id="door-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#e2e8f0" strokeWidth="0.7" />
          </pattern>
          <filter id="table-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity=".16" />
          </filter>
        </defs>
        <rect width="700" height="500" fill="url(#door-grid)" />
        {roomPolygon.length >= 3 && (
          <polygon
            points={roomPolygon.map(point => `${point.x},${point.y}`).join(' ')}
            fill="#fff"
            stroke="#a8a29e"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        )}
        <g transform="translate(305 466)">
          <rect width="90" height="18" rx="7" fill="#d6d3d1" />
          <text x="45" y="13" textAnchor="middle" fontSize="10" fontWeight="700" fill="#57534e">ENTRÉE</text>
        </g>
        {tables.map((t, i) => {
        const x = t.position_x > 0 ? t.position_x : 100 + (i % 4) * 150;
        const y = t.position_y > 0 ? t.position_y : 90 + Math.floor(i / 4) * 120;
        const isHighlighted = t.id === highlightedTableId;
        const rectangular = t.shape === 'rectangular' || t.shape === 'rectangle';
        const width = rectangular ? 104 : 78;
        const height = rectangular ? 62 : 78;

        return (
          <g key={t.id} transform={`translate(${x - width / 2} ${y - height / 2})`} filter="url(#table-shadow)">
            {rectangular ? (
              <rect width={width} height={height} rx="12" fill={isHighlighted ? '#8b1e1e' : '#fff'} stroke={isHighlighted ? '#fca5a5' : '#d6d3d1'} strokeWidth={isHighlighted ? 5 : 2} />
            ) : (
              <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={isHighlighted ? '#8b1e1e' : '#fff'} stroke={isHighlighted ? '#fca5a5' : '#d6d3d1'} strokeWidth={isHighlighted ? 5 : 2} />
            )}
            <text x={width / 2} y={height / 2 - (isHighlighted ? 3 : -3)} textAnchor="middle" fontSize="11" fontWeight="700" fill={isHighlighted ? '#fff' : '#44403c'}>
              {t.name.length > 18 ? `${t.name.slice(0, 16)}…` : t.name}
            </text>
            {isHighlighted && <text x={width / 2} y={height / 2 + 15} textAnchor="middle" fontSize="9" fill="#fecaca">TABLE DE L’INVITÉ</text>}
          </g>
        );
      })}
      </svg>
    </div>
  );
}

const partySize = (guest) => 1 + (Number(guest?.companions) || 0);

const companionText = (guest) => {
  const count = Number(guest?.companions) || 0;
  if (count <= 0) return 'Sans accompagnant';

  return `Accompagné de ${count} personne${count > 1 ? 's' : ''}`;
};

function QrScanner({ onScan }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError('');
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setError('Le scan caméra n’est pas pris en charge ici. Importez une photo du QR code.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
      const detector = new Detector({ formats: ['qr_code'] });
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            onScan(codes[0].rawValue);
            stop();
          }
        } catch {
          // The next frame will retry.
        }
      }, 400);
    } catch {
      setError('Accès à la caméra refusé ou indisponible.');
      stop();
    }
  };

  const scanImage = async (file?: File) => {
    if (!file) return;
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setError('Ce navigateur ne peut pas lire le QR. Utilisez Chrome ou Edge récent.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await new Detector({ formats: ['qr_code'] }).detect(bitmap);
      if (!codes[0]?.rawValue) throw new Error();
      onScan(codes[0].rawValue);
    } catch {
      setError('Aucun QR code lisible dans cette image.');
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-stone-700">
            <ScanLine className="h-5 w-5 text-primary" />
            Scanner le QR de l’invité
          </div>
          <Button variant={active ? 'destructive' : 'default'} size="sm" onClick={active ? stop : start}>
            {active ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
            {active ? 'Arrêter' : 'Ouvrir la caméra'}
          </Button>
        </div>
        <div className={cn('relative overflow-hidden rounded-xl bg-stone-950', active ? 'aspect-video' : 'hidden')}>
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,.3)]" />
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50">
          <ImageUp className="h-4 w-4" />
          Importer une photo du QR code
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={event => scanImage(event.target.files?.[0])} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
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
    mutationFn: (guestId: string) => base44.entities.Guest.update(guestId, { status: 'confirmed' }),
    onSuccess: (_updated, guestId) => {
      queryClient.setQueryData(['guests', activeWeddingId], (current: any[] = []) =>
        current.map(guest => guest.id === guestId ? { ...guest, status: 'confirmed' } : guest),
      );
      if (navigator.onLine) {
        void queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] });
      }
    },
  });

  const confirmedPeople = guests
    .filter(g => g.status === 'confirmed')
    .reduce((sum, guest) => sum + partySize(guest), 0);
  const totalPeople = guests.reduce((sum, guest) => sum + partySize(guest), 0);

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

  const handleQrScan = (value: string) => {
    let token = value.trim();
    try {
      const url = new URL(value);
      token = url.searchParams.get('invite') || value;
    } catch {
      // A plain invitation reference is valid too.
    }
    const guest = guests.find(item => item.invitation_link === token || item.qr_code === token);
    if (!guest) {
      setScanResult({ guest: { first_name: 'QR', last_name: 'inconnu', status: 'introuvable' }, status: 'not_found' });
      return;
    }
    handleCheck(guest);
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
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" className="h-11 w-11 shrink-0" />
            <div>
              <h1 className="font-display text-xl font-semibold text-stone-800">Contrôle d'entrée</h1>
              <p className="text-xs text-stone-500">Agent d'accueil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OfflineStatus compact />
            <Button variant="outline" size="sm" onClick={() => setShowFullMap(!showFullMap)}>
              <MapIcon className="w-4 h-4 mr-2 text-primary" />
              Plan de salle
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/logout" method="post" as="button"><LogOut className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-6 mt-2">
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: totalPeople, icon: Users, color: 'text-stone-700' },
            { label: 'Entrés', value: confirmedPeople, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Attente', value: totalPeople - confirmedPeople, icon: AlertCircle, color: 'text-amber-600' },
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
              <TableMap tables={tables} highlightedTableId={null} weddingId={activeWeddingId} />
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
                      <div className="mx-auto max-w-sm rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                        {companionText(scanResult.guest)} · {partySize(scanResult.guest)} personne{partySize(scanResult.guest) > 1 ? 's' : ''} à comptabiliser
                      </div>
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
                      <div className="mx-auto max-w-sm rounded-xl border border-green-200 bg-white/70 px-4 py-3 text-sm font-medium text-green-800">
                        {companionText(scanResult.guest)} · entrée de {partySize(scanResult.guest)} personne{partySize(scanResult.guest) > 1 ? 's' : ''} validée
                      </div>
                      
                      {scanResult.guest.table_id ? (
                        <div className="mt-6 pt-6 border-t border-green-200">
                          <p className="font-medium text-stone-700 mb-2">Orientez l'invité vers sa table :</p>
                          <TableMap tables={tables} highlightedTableId={scanResult.guest.table_id} weddingId={activeWeddingId} />
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
                      <div className="mx-auto max-w-sm rounded-xl border border-blue-200 bg-white/70 px-4 py-3 text-sm font-medium text-blue-800">
                        {companionText(scanResult.guest)} · {partySize(scanResult.guest)} personne{partySize(scanResult.guest) > 1 ? 's' : ''} déjà comptabilisée{partySize(scanResult.guest) > 1 ? 's' : ''}
                      </div>
                      
                      {scanResult.guest.table_id && (
                        <div className="mt-6 pt-4 border-t border-blue-200">
                          <TableMap tables={tables} highlightedTableId={scanResult.guest.table_id} weddingId={activeWeddingId} />
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
                  {scanResult.status === 'not_found' && (
                    <>
                      <XCircle className="mx-auto mb-2 h-12 w-12 text-red-600" />
                      <div className="font-display text-xl font-semibold text-red-700">QR code non reconnu</div>
                      <div className="text-stone-600">Cette référence ne correspond à aucun invité de ce mariage.</div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <QrScanner onScan={handleQrScan} />
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
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-800">{g.first_name} {g.last_name}</span>
                      <span className="block text-xs text-stone-500">{companionText(g)}</span>
                    </span>
                    <StatusBadge status={g.status} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

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
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-700">{g.first_name} {g.last_name}</span>
                      <span className="block text-xs text-stone-500">{companionText(g)}</span>
                    </span>
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
