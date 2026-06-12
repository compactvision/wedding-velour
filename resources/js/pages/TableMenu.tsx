import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import { Heart, Wine, UtensilsCrossed, IceCream, Sparkles, Send, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const CATEGORY_MAP = {
  drink: { label: 'Boissons', icon: <Wine className="w-5 h-5" /> },
  food: { label: 'Plats', icon: <UtensilsCrossed className="w-5 h-5" /> },
  dessert: { label: 'Desserts', icon: <IceCream className="w-5 h-5" /> },
  special: { label: 'Spécial', icon: <Sparkles className="w-5 h-5" /> },
};

export default function TableMenu() {
  const { url } = usePage();
  const searchParams = new URLSearchParams(url.split('?')[1] || '');
  const tableId = searchParams.get('table');

  const [table, setTable] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [selectedTab, setSelectedTab] = useState('drink');
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function load() {
      if (!tableId) { setLoading(false); return; }
      try {
        const data = await base44.public.tableMenu(tableId);
        setTable(data.table);
        setWedding(data.wedding);
        setMenuItems(data.menu_items || []);
        if (data.menu_items?.length) setSelectedTab(data.menu_items[0].category);
      } catch {
        setTable(null);
      }
      setLoading(false);
    }
    load();
  }, [tableId]);

  const handleOrder = async () => {
    if (!selected && !notes.trim()) return;
    setSending(true);
    const item = menuItems.find(i => i.id === selected);
    const order = await base44.public.createTableOrder(table.id, {
      guest_name: guestName.trim(),
      type: item ? item.category : 'special_request',
      description: item ? `${item.emoji || ''} ${item.name}` : notes,
      notes,
      status: 'pending',
      priority: 'normal',
    });
    setRecentOrders(prev => [order, ...prev]);
    setSent(true);
    setSending(false);
    setSelected(null);
    setNotes('');
    setTimeout(() => setSent(false), 3000);
  };

  const categories = [...new Set(menuItems.map(i => i.category))];
  const currentItems = menuItems.filter(i => i.category === selectedTab);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!table) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-sm w-full p-8 text-center">
        <Heart className="w-12 h-12 mx-auto text-primary mb-4" />
        <h1 className="font-display text-xl font-semibold">Table introuvable</h1>
        <p className="text-muted-foreground mt-2 text-sm">Ce QR code n'est pas valide.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/8 via-background to-background font-sans">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/15 to-transparent px-4 pt-10 pb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-10 bg-primary/40" />
          <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          <div className="h-px w-10 bg-primary/40" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{wedding?.title || 'Mariage'}</h1>
        <p className="text-muted-foreground text-sm mt-1">{table.name}</p>
      </div>

      <div className="max-w-md mx-auto px-4 pb-12 space-y-5">
        {/* Name input */}
        {!nameConfirmed ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-primary/20">
              <CardHeader><CardTitle className="font-display text-lg text-center">Bienvenue ! 👋</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">Quel est votre prénom pour passer votre commande ?</p>
                <Input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Votre prénom..."
                  className="text-center text-lg h-12"
                  onKeyDown={e => e.key === 'Enter' && guestName.trim() && setNameConfirmed(true)}
                />
                <Button className="w-full h-11" disabled={!guestName.trim()} onClick={() => setNameConfirmed(true)}>
                  Continuer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Bonjour <span className="font-semibold text-foreground">{guestName}</span> 👋</p>
              <button onClick={() => setNameConfirmed(false)} className="text-xs text-primary underline mt-1">Changer de nom</button>
            </div>

            {/* Category tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 bg-muted rounded-xl p-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedTab(cat); setSelected(null); }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all",
                      selectedTab === cat ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {CATEGORY_MAP[cat]?.icon}
                    {CATEGORY_MAP[cat]?.label || cat}
                  </button>
                ))}
              </div>
            )}

            {/* Menu items */}
            {currentItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {currentItems.map(item => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(selected === item.id ? null : item.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      selected === item.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                    )}
                  >
                    <div className="text-2xl mb-2">{item.emoji || '🍽️'}</div>
                    <div className="text-sm font-medium leading-tight">{item.name}</div>
                    {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun article dans cette catégorie</p>
            )}

            {/* Custom request */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">Demande spéciale</Label>
                </div>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Précisions, allergies, autre souhait..."
                />
              </CardContent>
            </Card>

            {/* Send button */}
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Commande envoyée !</span>
                </motion.div>
              ) : (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button
                    className="w-full h-12 text-base"
                    disabled={!selected && !notes.trim()}
                    onClick={handleOrder}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Commander</>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent orders */}
            {recentOrders.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Mes commandes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="text-sm">{o.description}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
