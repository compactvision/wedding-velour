import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Download, FileText, FolderLock, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const labels: Record<string, string> = { contract: 'Contrat', quote: 'Devis', invoice: 'Facture', plan: 'Plan', permit: 'Autorisation', other: 'Autre' };

export default function DocumentsPage() {
    const workspace = (usePage().props as any).workspace;
    const org = workspace?.organization?.slug || '';
    const event = workspace?.event?.slug || '';
    const permissions: string[] = workspace?.permissions || [];
    const canManage = permissions.includes('*') || permissions.includes('documents.manage');
    const base = `/api/organizations/${encodeURIComponent(org)}/events/${encodeURIComponent(event)}/documents`;
    const client = useQueryClient();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('other');
    const [file, setFile] = useState<File | null>(null);
    const query = useQuery({
        queryKey: ['documents', workspace?.event?.id],
        queryFn: async () => (await axios.get(base)).data.data,
        enabled: Boolean(workspace),
    });
    const refresh = () => client.invalidateQueries({ queryKey: ['documents', workspace?.event?.id] });
    const upload = useMutation({
        mutationFn: async () => {
            const form = new FormData();
            form.append('title', title); form.append('category', category);

            if (file) {
form.append('file', file);
}

            await axios.post(base, form);
        },
        onSuccess: () => {
 setTitle(''); setFile(null); refresh(); 
},
    });
    const remove = useMutation({
        mutationFn: (id: string) => axios.delete(`${base}/${id}`),
        onSuccess: refresh,
    });

    if (!workspace || query.isError) {
return <EmptyState icon={FolderLock} title="Documents indisponibles" description="Choisissez un événement avec le module Documents activé." />;
}

    const data = query.data;

    return <div>
        <PageHeader title="Documents" subtitle={`${workspace.event.name} · coffre documentaire privé`} />
        {canManage && <Card className="mb-5">
            <CardHeader><CardTitle>Ajouter un document</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]">
                <div><Label>Titre</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div><Label>Catégorie</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Fichier (20 Mo max.)</Label><Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
                <Button className="self-end" disabled={!title || !file || upload.isPending} onClick={() => upload.mutate()}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
            </CardContent>
        </Card>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.documents.map((document: any) => {
                const version = document.versions[0];

                return <Card key={document.id}><CardContent className="p-4">
                    <div className="flex justify-between gap-3"><FileText className="h-7 w-7 text-primary" /><Badge variant="outline">{labels[document.category]}</Badge></div>
                    <div className="mt-3 font-semibold">{document.title}</div>
                    <div className="text-xs text-muted-foreground">{version?.original_name} · v{version?.version_number} · {Math.ceil((version?.size_bytes || 0) / 1024)} Ko</div>
                    <div className="mt-4 flex gap-2">
                        {version && <Button size="sm" variant="outline" asChild><a href={`${base}/${document.id}/versions/${version.id}/download`}><Download className="mr-2 h-4 w-4" />Télécharger</a></Button>}
                        {canManage && <Button size="sm" variant="ghost" onClick={() => remove.mutate(document.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                </CardContent></Card>;
            })}
        </div>
    </div>;
}
