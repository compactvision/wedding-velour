import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Wine, UtensilsCrossed, IceCream, Sparkles, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG = {
  drink: { label: 'Boissons', icon: Wine, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  food: { label: 'Plats', icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  dessert: { label: 'Desserts', icon: IceCream, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  special: { label: 'Spécial', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
};

const EMOJI_SUGGESTIONS = {
  drink: ['🥂', '🍷', '🥃', '🍾', '💧', '🍊', '🍹', '☕', '🧃', '🫗'],
  food: ['🐟', '🥩', '🥗', '🍝', '🍲', '🥘', '🍗', '🧀', '🥚', '🫕'],
  dessert: ['🎂', '🍰', '🍬', '🍧', '🍫', '🧁', '🍮', '🍩', '🍪', '🫐'],
  special: ['⭐', '✨', '🎁', '💐', '🎵', '🎉', '🎀', '💫', '🌟', '🎊'],
};

function MenuItemDialog({ open, onOpenChange, item, weddingId, onSave }) {
  const [form, setForm] = useState({ name: '', emoji: '🥂', category: 'drink', description: '', available_quantity: 0, is_available: true });

  React.useEffect(() => {
    if (item) {
      setForm({ name: item.name || '', emoji: item.emoji || '🥂', category: item.category || 'drink', description: item.description || '', available_quantity: item.available_quantity || 0, is_available: item.is_available !== false });
    } else {
      setForm({ name: '', emoji: '🥂', category: 'drink', description: '', available_quantity: 0, is_available: true });
    }
  }, [item, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">{item ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, emoji: EMOJI_SUGGESTIONS[v][0] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1 mt-1 mb-2">
              {EMOJI_SUGGESTIONS[form.category].map(e => (
                <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                  className={cn("text-xl p-1 rounded hover:bg-muted transition-all", form.emoji === e && "bg-primary/15 ring-2 ring-primary")}>
                  {e}
                </button>
              ))}
            </div>
            <Input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} placeholder="Ou saisir un emoji..." className="text-center" />
          </div>
          <div>
            <Label>Nom de l'article *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Champagne rosé" />
          </div>
          <div>
            <Label>Description (optionnel)</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Piper-Heidsieck brut" />
          </div>
          <div>
            <Label>Quantité disponible <span className="text-muted-foreground text-xs">(0 = illimitée)</span></Label>
            <Input type="number" min={0} value={form.available_quantity} onChange={e => setForm({ ...form, available_quantity: Number(e.target.value), remaining_quantity: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Disponible au menu</Label>
            <Switch checked={form.is_available} onCheckedChange={v => setForm({ ...form, is_available: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MenuAdmin() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: items = [] } = useQuery({
    queryKey: ['menu-items', activeWeddingId],
    queryFn: () => base44.entities.MenuItem.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create({ ...data, wedding_id: activeWeddingId, remaining_quantity: data.available_quantity }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-items', activeWeddingId] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-items', activeWeddingId] }); setShowForm(false); setEditingItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items', activeWeddingId] }),
  });

  const toggleAvail = (item) => updateMutation.mutate({ id: item.id, data: { is_available: !item.is_available } });

  const handleSave = (formData) => {
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

  return (
    <div>
      <PageHeader title="Menu" subtitle={`${items.length} articles configurés`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <Button onClick={() => { setEditingItem(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </PageHeader>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all border", activeCategory === 'all' ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}
        >
          Tous ({items.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => {
          const count = items.filter(i => i.category === k).length;
          const Icon = v.icon;
          return (
            <button key={k} onClick={() => setActiveCategory(k)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5",
                activeCategory === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              <Icon className="w-3.5 h-3.5" /> {v.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucun article" description="Ajoutez les boissons, plats et desserts qui seront proposés aux invités via QR code" actionLabel="Ajouter un article" onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const config = CATEGORY_CONFIG[item.category];
            return (
              <Card key={item.id} className={cn("border-2 transition-all hover:shadow-md", item.is_available ? config.bg : "bg-muted/50 border-border opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{item.emoji || '🍽️'}</div>
                    <div className="flex gap-1">
                      <Switch checked={item.is_available} onCheckedChange={() => toggleAvail(item)} />
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    {item.available_quantity > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {item.remaining_quantity ?? item.available_quantity}/{item.available_quantity} restants
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Illimité</Badge>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MenuItemDialog open={showForm} onOpenChange={setShowForm} item={editingItem} weddingId={activeWeddingId} onSave={handleSave} />
    </div>
  );
}