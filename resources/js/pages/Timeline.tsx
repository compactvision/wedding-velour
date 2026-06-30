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
import { Image, Plus, Clock, Play, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons = {
  ceremony: '💒', reception: '🥂', dinner: '🍽️', dance: '💃',
  speech: '🎤', activity: '🎯', other: '📋'
};

function EventFormDialog({ open, onOpenChange, event, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', time: '', category: 'other', notify_all: false, image_url: '', sub_details_text: '' });
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (event) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        time: event.time || '',
        category: event.category || 'other',
        notify_all: event.notify_all || false,
        image_url: event.image_url || '',
        sub_details_text: (event.sub_details || []).join('\n'),
      });
    } else {
      setForm({ title: '', description: '', time: '', category: 'other', notify_all: false, image_url: '', sub_details_text: '' });
    }
  }, [event, open]);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, image_url: result.file_url }));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const sub_details = form.sub_details_text
      .split('\n')
      .map(detail => detail.trim())
      .filter(Boolean);
    onSave({
      title: form.title,
      description: form.description,
      time: form.time,
      category: form.category,
      notify_all: form.notify_all,
      image_url: form.image_url || null,
      sub_details,
    });
  };

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
          <div className="space-y-2">
            <Label>Sous-détails</Label>
            <Textarea
              value={form.sub_details_text}
              onChange={e => setForm({...form, sub_details_text: e.target.value})}
              placeholder={'Entrée des familles\nRéception des invités\nPhotos officielles'}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Une ligne par étape interne de ce grand événement.</p>
          </div>
          <div className="space-y-2">
            <Label>Photo de section</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="/storage/uploads/photo.jpg" />
              <Button type="button" variant="outline" className="relative shrink-0 overflow-hidden" disabled={uploading}>
                <Image className="mr-2 h-4 w-4" />
                {uploading ? 'Upload...' : 'Importer'}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={e => uploadImage(e.target.files?.[0])}
                />
              </Button>
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="" className="h-32 w-full rounded-lg object-cover" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.notify_all} onCheckedChange={v => setForm({...form, notify_all: v})} />
            <Label>Notifier tous les invités</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.title || !form.time}>Enregistrer</Button>
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
          <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-border sm:left-6" />
          <div className="space-y-4">
            {sorted.map((evt, i) => (
              <div key={evt.id} className="relative flex gap-3 sm:gap-4 sm:pl-2">
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2",
                  evt.status === 'completed' ? 'bg-green-50 border-green-300' :
                  evt.status === 'in_progress' ? 'bg-primary/10 border-primary' :
                  'bg-card border-border'
                )}>
                  {categoryIcons[evt.category] || '📋'}
                </div>
                <Card className="min-w-0 flex-1 p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-primary">{evt.time}</span>
                        <StatusBadge status={evt.status} />
                      </div>
                      <h3 className="font-display font-semibold">{evt.title}</h3>
                      {evt.description && <p className="text-sm text-muted-foreground mt-1">{evt.description}</p>}
                      {evt.sub_details?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {evt.sub_details.map((detail, index) => (
                            <span key={`${evt.id}-${index}`} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              {detail}
                            </span>
                          ))}
                        </div>
                      )}
                      {evt.image_url && (
                        <img src={evt.image_url} alt="" className="mt-3 aspect-[16/7] w-full rounded-lg object-cover" />
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
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
