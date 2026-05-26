import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Clock, Play, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons = {
  ceremony: '💒', reception: '🥂', dinner: '🍽️', dance: '💃',
  speech: '🎤', activity: '🎯', other: '📋'
};

function EventFormDialog({ open, onOpenChange, event, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', time: '', category: 'other', notify_all: false });

  React.useEffect(() => {
    if (event) {
      setForm({ title: event.title || '', description: event.description || '', time: event.time || '', category: event.category || 'other', notify_all: event.notify_all || false });
    } else {
      setForm({ title: '', description: '', time: '', category: 'other', notify_all: false });
    }
  }, [event, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{event ? 'Modifier' : 'Nouvel événement'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Entrée des mariés" /></div>
          <div><Label>Heure</Label><Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ceremony">Cérémonie</SelectItem>
                <SelectItem value="reception">Réception</SelectItem>
                <SelectItem value="dinner">Dîner</SelectItem>
                <SelectItem value="dance">Danse</SelectItem>
                <SelectItem value="speech">Discours</SelectItem>
                <SelectItem value="activity">Activité</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={form.notify_all} onCheckedChange={v => setForm({...form, notify_all: v})} />
            <Label>Notifier tous les invités</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title || !form.time}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Timeline() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['timeline', activeWeddingId],
    queryFn: () => base44.entities.TimelineEvent.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create({ ...data, wedding_id: activeWeddingId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline', activeWeddingId] }); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline', activeWeddingId] }); setShowForm(false); setEditingEvent(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeline', activeWeddingId] }),
  });

  const handleSave = (formData) => {
    if (editingEvent) updateMutation.mutate({ id: editingEvent.id, data: formData });
    else createMutation.mutate(formData);
  };

  const sorted = [...events].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div>
      <PageHeader title="Programme" subtitle={`${events.length} événements`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <Button onClick={() => { setEditingEvent(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </PageHeader>

      {sorted.length === 0 ? (
        <EmptyState icon={Clock} title="Aucun événement" description="Planifiez le programme de votre journée" actionLabel="Créer un événement" onAction={() => setShowForm(true)} />
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {sorted.map((evt, i) => (
              <div key={evt.id} className="relative flex gap-4 pl-2">
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2",
                  evt.status === 'completed' ? 'bg-green-50 border-green-300' :
                  evt.status === 'in_progress' ? 'bg-primary/10 border-primary' :
                  'bg-card border-border'
                )}>
                  {categoryIcons[evt.category] || '📋'}
                </div>
                <Card className="flex-1 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-primary">{evt.time}</span>
                        <StatusBadge status={evt.status} />
                      </div>
                      <h3 className="font-display font-semibold">{evt.title}</h3>
                      {evt.description && <p className="text-sm text-muted-foreground mt-1">{evt.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      {evt.status === 'upcoming' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: evt.id, data: { status: 'in_progress' } })}>
                          <Play className="w-3.5 h-3.5 text-primary" />
                        </Button>
                      )}
                      {evt.status === 'in_progress' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: evt.id, data: { status: 'completed' } })}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingEvent(evt); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(evt.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      <EventFormDialog open={showForm} onOpenChange={setShowForm} event={editingEvent} onSave={handleSave} />
    </div>
  );
}