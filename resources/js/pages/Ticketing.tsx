import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CircleDollarSign, Plus, QrCode, TicketCheck, Tickets } from 'lucide-react';
import React, { useState } from 'react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const money = (amount: number, currency: string) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount / 100);

export default function Ticketing() {
    const workspace = (usePage().props as any).workspace;
    const org = workspace?.organization?.slug || '';
    const event = workspace?.event?.slug || '';
    const permissions: string[] = workspace?.permissions || [];
    const canManage = permissions.includes('*') || permissions.includes('ticketing.manage');
    const canSell = permissions.includes('*') || permissions.includes('ticketing.sales');
    const base = `/api/organizations/${encodeURIComponent(org)}/events/${encodeURIComponent(event)}/ticketing`;
    const client = useQueryClient();
    const [type, setType] = useState({ name: '', price: '', capacity: '' });
    const [order, setOrder] = useState({ ticket_type_id: '', quantity: '1', buyer_name: '', buyer_email: '' });
    const query = useQuery({ queryKey: ['ticketing', workspace?.event?.id], queryFn: async () => (await axios.get(base)).data.data, enabled: Boolean(workspace) });
    const refresh = () => client.invalidateQueries({ queryKey: ['ticketing', workspace?.event?.id] });
    const createType = useMutation({ mutationFn: () => axios.post(`${base}/types`, { name: type.name, price_minor: Math.round(Number(type.price) * 100), capacity: Number(type.capacity) }), onSuccess: () => {
 setType({ name: '', price: '', capacity: '' }); refresh(); 
} });
    const createOrder = useMutation({ mutationFn: () => axios.post(`${base}/orders`, { ...order, quantity: Number(order.quantity) }), onSuccess: () => {
 setOrder({ ticket_type_id: '', quantity: '1', buyer_name: '', buyer_email: '' }); refresh(); 
} });
    const confirm = useMutation({ mutationFn: (id: string) => axios.put(`${base}/orders/${id}/confirm`), onSuccess: refresh });

    if (!workspace || query.isError) {
return <EmptyState icon={Tickets} title="Billetterie indisponible" description="Choisissez un événement avec le module Billetterie activé." />;
}

    const data = query.data;
    const currency = data?.types[0]?.currency || workspace.organization.currency || 'USD';

    return <div>
        <PageHeader title="Billetterie" subtitle={`${workspace.event.name} · ventes, quotas et billets QR`} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            ['Capacité', data?.summary.capacity || 0, Tickets], ['Billets vendus', data?.summary.sold || 0, TicketCheck],
            ['Revenus', money(data?.summary.revenue_minor || 0, currency), CircleDollarSign], ['Entrées scannées', data?.summary.scanned || 0, QrCode],
        ].map(([label,value,Icon]: any) => <Card key={label} className="p-4"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-primary" /><div><div className="text-lg font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></div></Card>)}</div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card><CardHeader><CardTitle>Catégories</CardTitle></CardHeader><CardContent className="space-y-3">
                {canManage && <div className="grid gap-2 sm:grid-cols-4"><Input placeholder="Nom" value={type.name} onChange={e => setType({...type,name:e.target.value})}/><Input placeholder={`Prix ${currency}`} type="number" value={type.price} onChange={e => setType({...type,price:e.target.value})}/><Input placeholder="Quota" type="number" value={type.capacity} onChange={e => setType({...type,capacity:e.target.value})}/><Button disabled={!type.name || !type.capacity} onClick={() => createType.mutate()}><Plus className="mr-2 h-4 w-4"/>Ajouter</Button></div>}
                {data?.types.map((entry: any) => <div key={entry.id} className="flex justify-between rounded-xl border p-3"><div><div className="font-semibold">{entry.name}</div><div className="text-xs text-muted-foreground">{entry.sold_count}/{entry.capacity} vendus</div></div><div className="font-semibold">{money(entry.price_minor, entry.currency)}</div></div>)}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Nouvelle commande</CardTitle></CardHeader><CardContent className="space-y-3">
                {canSell && <><div><Label>Catégorie</Label><Select value={order.ticket_type_id} onValueChange={value => setOrder({...order,ticket_type_id:value})}><SelectTrigger><SelectValue placeholder="Sélectionner"/></SelectTrigger><SelectContent>{data?.types.map((entry:any)=><SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Acheteur" value={order.buyer_name} onChange={e=>setOrder({...order,buyer_name:e.target.value})}/><Input placeholder="E-mail" value={order.buyer_email} onChange={e=>setOrder({...order,buyer_email:e.target.value})}/><Input type="number" min="1" value={order.quantity} onChange={e=>setOrder({...order,quantity:e.target.value})}/><Button disabled={!order.ticket_type_id || !order.buyer_name} onClick={()=>createOrder.mutate()}>Créer</Button></div></>}
            </CardContent></Card>
        </div>
        <Card className="mt-5"><CardHeader><CardTitle>Commandes</CardTitle></CardHeader><CardContent className="space-y-2">{data?.orders.map((entry:any)=><div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><div className="font-semibold">{entry.reference} · {entry.buyer_name}</div><div className="text-xs text-muted-foreground">{entry.ticket_count} billet(s) · {money(entry.total_minor,entry.currency)}</div></div><div className="flex gap-2"><Badge variant="outline">{entry.status === 'confirmed' ? 'Confirmée' : 'En attente'}</Badge>{canSell && entry.status === 'pending' && <Button size="sm" onClick={()=>confirm.mutate(entry.id)}>Confirmer</Button>}</div></div>)}</CardContent></Card>
    </div>;
}
