import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { CheckCircle2, XCircle, UtensilsCrossed, Send, MapPin, CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import OfflineStatus from '@/components/shared/OfflineStatus';
import BrandLogo from '@/components/shared/BrandLogo';

export default function GuestPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');
  const [guest, setGuest] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState({ type: 'drink', description: '', notes: '' });
  const [rsvpMessage, setRsvpMessage] = useState('');

  // Load guest by invitation link
  useEffect(() => {
    async function loadGuest() {
      if (!inviteToken) { setLoading(false); return; }
      try {
        const data = await base44.public.invitation(inviteToken);
        setGuest(data.guest);
        setWedding(data.wedding);
        setPublicTimeline(data.timeline || []);
        setPublicOrders(data.orders || []);
      } catch {
        setGuest(null);
      }
      setLoading(false);
    }
    loadGuest();
  }, [inviteToken]);

  const [publicTimeline, setPublicTimeline] = useState([]);
  const [publicOrders, setPublicOrders] = useState([]);

  const timeline = publicTimeline;
  const myOrders = publicOrders;

  const rsvpMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => base44.public.respondToInvitation(inviteToken!, { status, rsvp_message: rsvpMessage }),
    onSuccess: (_: any, { status }: { status: string }) => setGuest((prev: any) => ({ ...prev, status })),
  });

  const orderMutation = useMutation({
    mutationFn: (data: Record<string, any>) => base44.public.createInvitationOrder(inviteToken!, data),
    onSuccess: (order: any) => {
      setPublicOrders((prev: any[]) => [order, ...prev]);
      setOrderForm({ type: 'drink', description: '', notes: '' });
    },
  });

  const handleOrder = () => {
    orderMutation.mutate({
      ...orderForm,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <BrandLogo variant="mark" className="mx-auto mb-4 h-24 w-24" />
          <h1 className="font-display text-2xl font-semibold">Invitation invalide</h1>
          <p className="text-muted-foreground mt-2">Ce lien d'invitation n'est pas valide ou a expiré.</p>
        </Card>
      </div>
    );
  }

  const sortedTimeline = [...timeline].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-primary/10 to-background px-4 pt-12 pb-8 text-center">
        <div className="absolute right-4 top-4">
          <OfflineStatus />
        </div>
        <BrandLogo variant="mark" className="mx-auto mb-3 h-24 w-24" />
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">{wedding?.title || 'Mariage'}</h1>
        {wedding?.date && (
          <p className="mt-2 text-muted-foreground flex items-center justify-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(wedding.date), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        )}
        {wedding?.venue && (
          <p className="mt-1 text-muted-foreground flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> {wedding.venue}
          </p>
        )}
        <p className="mt-4 text-lg">
          Bienvenue, <span className="font-semibold">{guest.first_name} {guest.last_name}</span>
        </p>
        <StatusBadge status={guest.status} className="mt-2" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">
        {/* RSVP */}
        {(guest.status === 'invited') && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Confirmer votre présence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Message (optionnel)</Label>
                <Textarea value={rsvpMessage} onChange={e => setRsvpMessage(e.target.value)} placeholder="Un petit mot pour les mariés..." />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => rsvpMutation.mutate({ status: 'confirmed' })}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Je serai présent(e)
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => rsvpMutation.mutate({ status: 'declined' })}>
                  <XCircle className="w-4 h-4 mr-2" /> Je ne pourrai pas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order */}
        {guest.status === 'confirmed' && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                Faire une demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={orderForm.type} onValueChange={v => setOrderForm({...orderForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drink">🍷 Boisson</SelectItem>
                    <SelectItem value="food">🍽️ Nourriture</SelectItem>
                    <SelectItem value="dessert">🍰 Dessert</SelectItem>
                    <SelectItem value="special_request">✨ Demande spéciale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={orderForm.description} onChange={e => setOrderForm({...orderForm, description: e.target.value})} placeholder="Ex: Un verre de champagne" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={orderForm.notes} onChange={e => setOrderForm({...orderForm, notes: e.target.value})} placeholder="Précisions..." />
              </div>
              <Button className="w-full" onClick={handleOrder} disabled={!orderForm.description}>
                <Send className="w-4 h-4 mr-2" /> Envoyer
              </Button>

              {myOrders.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Mes demandes</p>
                  {myOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{o.description}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {sortedTimeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Programme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedTimeline.map(evt => (
                  <div key={evt.id} className="flex gap-3 items-start">
                    <span className="font-mono text-sm font-semibold text-primary min-w-[45px]">{evt.time}</span>
                    <div>
                      <p className="text-sm font-medium">{evt.title}</p>
                      {evt.description && <p className="text-xs text-muted-foreground">{evt.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
