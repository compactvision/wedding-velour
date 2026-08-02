import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import {
    Wine,
    UtensilsCrossed,
    IceCream,
    Star,
    Send,
    CheckCircle2,
    Clock,
    MessageSquareText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import OfflineStatus from '@/components/shared/OfflineStatus';
import BrandLogo from '@/components/shared/BrandLogo';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const CATEGORY_MAP = {
    drink: { label: 'Boissons', icon: <Wine className="h-5 w-5" /> },
    food: { label: 'Plats', icon: <UtensilsCrossed className="h-5 w-5" /> },
    dessert: { label: 'Desserts', icon: <IceCream className="h-5 w-5" /> },
    special: { label: 'Spécial', icon: <Star className="h-5 w-5" /> },
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
    const { online } = useOfflineSync();

    useEffect(() => {
        async function load() {
            if (!tableId) {
                setLoading(false);
                return;
            }
            try {
                const data = await base44.public.tableMenu(tableId);
                setTable(data.table);
                setWedding(data.wedding);
                setMenuItems(data.menu_items || []);
                if (data.menu_items?.length)
                    setSelectedTab(data.menu_items[0].category);
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
        const item = menuItems.find((i) => i.id === selected);
        const order = await base44.public.createTableOrder(table.id, {
            guest_name: guestName.trim(),
            type: item ? item.category : 'special_request',
            description: item ? `${item.emoji || ''} ${item.name}` : notes,
            notes,
            status: 'pending',
            priority: 'normal',
        });
        setRecentOrders((prev) => [order, ...prev]);
        setSent(true);
        setSending(false);
        setSelected(null);
        setNotes('');
        setTimeout(() => setSent(false), 3000);
    };

    const categories = [...new Set(menuItems.map((i) => i.category))];
    const currentItems = menuItems.filter((i) => i.category === selectedTab);

    if (loading)
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
        );

    if (!table)
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <Card className="w-full max-w-sm p-8 text-center">
                    <BrandLogo
                        variant="mark"
                        className="mx-auto mb-4 h-24 w-24"
                    />
                    <h1 className="font-display text-xl font-semibold">
                        Table introuvable
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Ce QR code n'est pas valide.
                    </p>
                </Card>
            </div>
        );

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary/8 via-background to-background font-sans">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary/15 to-transparent px-4 pt-10 pb-6 text-center">
                <div className="mx-auto mb-4 flex max-w-md justify-end">
                    <OfflineStatus />
                </div>
                <div className="mb-3 flex items-center justify-center gap-3">
                    <div className="h-px w-10 bg-primary/40" />
                    <BrandLogo variant="mark" className="h-20 w-20" />
                    <div className="h-px w-10 bg-primary/40" />
                </div>
                <h1 className="font-display text-2xl font-semibold text-foreground">
                    {wedding?.title || 'Mariage'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {table.name}
                </p>
            </div>

            <div className="mx-auto max-w-md space-y-5 px-4 pb-12">
                {/* Name input */}
                {!nameConfirmed ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-2 border-primary/20">
                            <CardHeader>
                                <CardTitle className="text-center font-display text-lg">
                                    Bienvenue ! 👋
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-center text-sm text-muted-foreground">
                                    Quel est votre prénom pour passer votre
                                    commande ?
                                </p>
                                <Input
                                    value={guestName}
                                    onChange={(e) =>
                                        setGuestName(e.target.value)
                                    }
                                    placeholder="Votre prénom..."
                                    className="h-12 text-center text-lg"
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' &&
                                        guestName.trim() &&
                                        setNameConfirmed(true)
                                    }
                                />
                                <Button
                                    className="h-11 w-full"
                                    disabled={!guestName.trim()}
                                    onClick={() => setNameConfirmed(true)}
                                >
                                    Continuer
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-5"
                    >
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Bonjour{' '}
                                <span className="font-semibold text-foreground">
                                    {guestName}
                                </span>{' '}
                                👋
                            </p>
                            <button
                                onClick={() => setNameConfirmed(false)}
                                className="mt-1 text-xs text-primary underline"
                            >
                                Changer de nom
                            </button>
                        </div>

                        {/* Category tabs */}
                        {categories.length > 0 && (
                            <div className="flex gap-2 rounded-xl bg-muted p-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedTab(cat);
                                            setSelected(null);
                                        }}
                                        className={cn(
                                            'flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-all',
                                            selectedTab === cat
                                                ? 'bg-card text-primary shadow'
                                                : 'text-muted-foreground hover:text-foreground',
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
                                {currentItems.map((item) => (
                                    <motion.button
                                        key={item.id}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() =>
                                            setSelected(
                                                selected === item.id
                                                    ? null
                                                    : item.id,
                                            )
                                        }
                                        className={cn(
                                            'rounded-xl border-2 p-4 text-left transition-all',
                                            selected === item.id
                                                ? 'border-primary bg-primary/5 shadow-md'
                                                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
                                        )}
                                    >
                                        <div className="mb-2 text-2xl">
                                            {item.emoji || '🍽️'}
                                        </div>
                                        <div className="text-sm leading-tight font-medium">
                                            {item.name}
                                        </div>
                                        {item.description && (
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                {item.description}
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Aucun article dans cette catégorie
                            </p>
                        )}

                        {/* Custom request */}
                        <Card>
                            <CardContent className="space-y-3 pt-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquareText className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-medium">
                                        Demande spéciale
                                    </Label>
                                </div>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Précisions, allergies, autre souhait..."
                                />
                            </CardContent>
                        </Card>

                        {/* Send button */}
                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="sent"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 py-3 text-green-700"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-medium">
                                        {online
                                            ? 'Commande envoyée !'
                                            : 'Commande enregistrée, en attente de connexion'}
                                    </span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <Button
                                        className="h-12 w-full text-base"
                                        disabled={!selected && !notes.trim()}
                                        onClick={handleOrder}
                                    >
                                        {sending ? (
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />{' '}
                                                Commander
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Recent orders */}
                        {recentOrders.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 font-display text-base">
                                        <Clock className="h-4 w-4 text-primary" />{' '}
                                        Mes commandes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {recentOrders.map((o) => (
                                        <div
                                            key={o.id}
                                            className="flex items-center justify-between rounded-lg bg-muted p-2"
                                        >
                                            <span className="text-sm">
                                                {o.description}
                                            </span>
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
