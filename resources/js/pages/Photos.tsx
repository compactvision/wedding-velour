import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Camera, Loader2, Star, Trash2, Upload } from 'lucide-react';
import React, { useState } from 'react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Photos() {
    const workspace = (usePage().props as any).workspace;
    const org = workspace?.organization?.slug || '';
    const event = workspace?.event?.slug || '';
    const permissions: string[] = workspace?.permissions || [];
    const canManage = permissions.includes('*') || permissions.includes('media.manage');
    const canPublish = permissions.includes('*') || permissions.includes('media.publish');
    const base = `/api/organizations/${encodeURIComponent(org)}/events/${encodeURIComponent(event)}/media`;
    const client = useQueryClient();
    const [category, setCategory] = useState('all');
    const query = useQuery({ queryKey: ['tenant-media', workspace?.event?.id], queryFn: async () => (await axios.get(base)).data.data, enabled: Boolean(workspace) });
    const refresh = () => client.invalidateQueries({ queryKey: ['tenant-media', workspace?.event?.id] });
    const upload = useMutation({
        mutationFn: async (files: FileList) => {
            for (const file of Array.from(files)) {
                const form = new FormData(); form.append('file', file); form.append('category', category === 'all' ? 'other' : category);
                await axios.post(base, form);
            }
        }, onSuccess: refresh,
    });
    const update = useMutation({ mutationFn: ({ id, data }: any) => axios.put(`${base}/${id}`, data), onSuccess: refresh });
    const remove = useMutation({ mutationFn: (id: string) => axios.delete(`${base}/${id}`), onSuccess: refresh });

    if (!workspace || query.isError) {
return <EmptyState icon={Camera} title="Galerie indisponible" description="Choisissez un événement avec le module Médias activé." />;
}

    const photos = (query.data?.photos || []).filter((photo: any) => category === 'all' || photo.category === category);

    return <div>
        <PageHeader title="Médias & galerie" subtitle={`${query.data?.summary.total || 0} média(s)`}>
            {canManage && <label><Button asChild><span>{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Ajouter</span></Button><Input className="hidden" type="file" accept="image/*" multiple onChange={e => e.target.files && upload.mutate(e.target.files)} /></label>}
        </PageHeader>
        <Tabs value={category} onValueChange={setCategory} className="mb-5"><TabsList>{[['all','Tout'],['ceremony','Cérémonie'],['reception','Réception'],['portraits','Portraits'],['candid','Spontanées'],['details','Détails']].map(([key,label]) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}</TabsList></Tabs>
        {!photos.length ? <EmptyState icon={Camera} title="Aucun média" description="Ajoutez les premières photos de cet événement." /> :
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{photos.map((photo: any) =>
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={photo.content_url} alt={photo.caption || ''} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 p-2 pt-8 opacity-0 group-hover:opacity-100">
                    {canPublish && <Button size="icon" variant="secondary" onClick={() => update.mutate({ id: photo.id, data: { action: photo.status === 'published' ? 'unpublish' : 'publish' } })}><Star className={`h-4 w-4 ${photo.status === 'published' ? 'fill-amber-400 text-amber-400' : ''}`} /></Button>}
                    {canManage && <Button size="icon" variant="destructive" onClick={() => remove.mutate(photo.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
            </div>)}</div>}
    </div>;
}
