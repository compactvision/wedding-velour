import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Star, Trash2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Photos() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', activeWeddingId],
    queryFn: () => base44.entities.Photo.filter({ wedding_id: activeWeddingId }, '-created_date'),
    enabled: !!activeWeddingId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Photo.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', activeWeddingId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Photo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', activeWeddingId] }),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, is_featured }) => base44.entities.Photo.update(id, { is_featured: !is_featured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', activeWeddingId] }),
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await createMutation.mutateAsync({
        wedding_id: activeWeddingId,
        url: file_url,
        category: 'other',
      });
    }
    setUploading(false);
  };

  const filtered = category === 'all' ? photos : photos.filter(p => p.category === category);

  return (
    <div>
      <PageHeader title="Galerie" subtitle={`${photos.length} photos`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <label className={cn("cursor-pointer", uploading && "pointer-events-none opacity-50")}>
          <Button asChild>
            <span>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </span>
          </Button>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      </PageHeader>

      <Tabs value={category} onValueChange={setCategory} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="ceremony">Cérémonie</TabsTrigger>
          <TabsTrigger value="reception">Réception</TabsTrigger>
          <TabsTrigger value="portraits">Portraits</TabsTrigger>
          <TabsTrigger value="candid">Spontanées</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState icon={Camera} title="Aucune photo" description="Uploadez vos premières photos de mariage" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(photo => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-muted" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                  {photo.caption && <p className="text-white text-xs truncate">{photo.caption}</p>}
                  {photo.is_featured && <Star className="w-4 h-4 text-amber-400" fill="currentColor" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedPhoto && (
            <div>
              <img src={selectedPhoto.url} alt="" className="w-full max-h-[70vh] object-contain bg-black" />
              <div className="p-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{selectedPhoto.caption || 'Sans légende'}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { toggleFeatured.mutate({ id: selectedPhoto.id, is_featured: selectedPhoto.is_featured }); }}>
                    <Star className={cn("w-4 h-4", selectedPhoto.is_featured ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteMutation.mutate(selectedPhoto.id); setSelectedPhoto(null); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}