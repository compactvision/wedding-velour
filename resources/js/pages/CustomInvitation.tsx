import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CheckCircle2, Heart, Image, MailOpen, Palette, Save } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const defaultInvitation = {
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

export default function CustomInvitation() {
  const { weddings, activeWedding, activeWeddingId, setActiveWeddingId, isLoading } = useActiveWedding();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultInvitation);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activeWedding) return;
    setForm({
      ...defaultInvitation,
      title: activeWedding.title || '',
      ...(activeWedding.invitation_custom || {}),
    });
  }, [activeWedding]);

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.Wedding.update(activeWeddingId, { invitation_custom: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const uploadBackground = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, background_image: result.file_url }));
    } finally {
      setUploading(false);
    }
  };

  if (!activeWedding && !isLoading) {
    return (
      <EmptyState
        icon={MailOpen}
        title="Aucun mariage actif"
        description="Créez ou sélectionnez un mariage pour personnaliser son invitation."
      />
    );
  }

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div>
      <PageHeader title="Custom invitation" subtitle="Textes, fond et ambiance de la carte">
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <Button onClick={() => updateMutation.mutate()} disabled={!activeWeddingId || updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </PageHeader>

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Invitation mise à jour.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
        <Tabs defaultValue="textes" className="min-w-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="textes">Textes</TabsTrigger>
            <TabsTrigger value="visuel">Visuel</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="textes" className="mt-4 space-y-4">
            <Card className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Petite phrase du haut</Label>
                  <Input value={form.eyebrow} onChange={e => update('eyebrow', e.target.value)} />
                </div>
                <div>
                  <Label>Titre affiché</Label>
                  <Input value={form.title} onChange={e => update('title', e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <Label>Salutation</Label>
                <Input value={form.greeting} onChange={e => update('greeting', e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Utilisez {'{guest}'} pour insérer le nom de l’invité.</p>
              </div>
              <div className="mt-4">
                <Label>Message principal</Label>
                <Textarea rows={6} value={form.body} onChange={e => update('body', e.target.value)} />
              </div>
              <div className="mt-4">
                <Label>Pied de carte</Label>
                <Input value={form.footer} onChange={e => update('footer', e.target.value)} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="visuel" className="mt-4 space-y-4">
            <Card className="space-y-4 p-5">
              <div>
                <Label>Image de fond</Label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <Input value={form.background_image} onChange={e => update('background_image', e.target.value)} placeholder="/storage/uploads/invitation.jpg" />
                  <Button type="button" variant="outline" className="relative shrink-0 overflow-hidden" disabled={uploading}>
                    <Image className="mr-2 h-4 w-4" />
                    {uploading ? 'Upload...' : 'Importer'}
                    <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={e => uploadBackground(e.target.files?.[0])} />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Couleur d’accent</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input type="color" value={form.accent_color} onChange={e => update('accent_color', e.target.value)} className="h-10 w-14 rounded border border-border bg-background" />
                  <Input value={form.accent_color} onChange={e => update('accent_color', e.target.value)} />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-4 space-y-4">
            <Card className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Question RSVP</Label>
                  <Input value={form.rsvp_question} onChange={e => update('rsvp_question', e.target.value)} />
                </div>
                <div>
                  <Label>Bouton accepter</Label>
                  <Input value={form.accept_label} onChange={e => update('accept_label', e.target.value)} />
                </div>
                <div>
                  <Label>Bouton décliner</Label>
                  <Input value={form.decline_label} onChange={e => update('decline_label', e.target.value)} />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="relative min-h-[620px] bg-stone-950 p-5 text-white">
              {form.background_image && <img src={form.background_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />}
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/70" />
              <div className="relative flex min-h-[580px] flex-col justify-between rounded-lg border border-white/25 p-8 text-center">
                <div>
                  <div className="mx-auto mb-6 flex items-center justify-center gap-3" style={{ color: form.accent_color }}>
                    <div className="h-px w-16 bg-current" />
                    <Heart className="h-5 w-5 fill-current" />
                    <div className="h-px w-16 bg-current" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/75">{form.eyebrow}</p>
                  <h2 className="mt-5 font-display text-4xl font-medium">{form.title || activeWedding?.title}</h2>
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80">
                    <CalendarDays className="h-4 w-4" />
                    {activeWedding?.date ? format(new Date(activeWedding.date), 'd MMMM yyyy', { locale: fr }) : 'Date du mariage'}
                  </div>
                </div>

                <div className="mx-auto max-w-sm rounded-lg bg-white/92 p-6 text-stone-800 shadow-2xl">
                  <p className="font-display text-xl" style={{ color: form.accent_color }}>{form.greeting.replace('{guest}', 'Mado M.')}</p>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{form.body}</p>
                  <div className="mt-6 grid gap-2">
                    <button className="rounded-md px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: form.accent_color }}>{form.accept_label}</button>
                    <button className="rounded-md border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600">{form.decline_label}</button>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-[0.28em] text-white/75">{form.footer}</p>
              </div>
            </div>
          </Card>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Palette className="h-3.5 w-3.5" />
            L’aperçu reprend aussi l’image de fond qui sera utilisée au téléchargement.
          </div>
        </div>
      </div>
    </div>
  );
}
