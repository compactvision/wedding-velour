import { router, usePage } from '@inertiajs/react';
import { Calculator, Save, Users } from 'lucide-react';
import React, { useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PricingPlan = {
    slug: string;
    name: string;
    currency: string;
    base_price_minor: number;
    max_guests: number;
    guest_price_minor: number;
    included_modules: number;
    module_price_minor: number;
};

export default function PricingSettings({ plans }: { plans: PricingPlan[] }) {
    const { errors, flash } = usePage().props as any;
    const [processing, setProcessing] = useState(false);
    const [form, setForm] = useState(
        plans.map((plan) => ({
            ...plan,
            base_price: plan.base_price_minor / 100,
            guest_price: plan.guest_price_minor / 100,
            module_price: plan.module_price_minor / 100,
        })),
    );

    const update = (
        slug: string,
        key:
            | 'base_price'
            | 'max_guests'
            | 'guest_price'
            | 'included_modules'
            | 'module_price',
        value: number,
    ) =>
        setForm((current) =>
            current.map((plan) =>
                plan.slug === slug ? { ...plan, [key]: value } : plan,
            ),
        );

    const save = () => {
        setProcessing(true);
        router.put(
            '/settings/pricing',
            {
                plans: form.map((plan) => ({
                    slug: plan.slug,
                    base_price_minor: Math.round(plan.base_price * 100),
                    max_guests: plan.max_guests,
                    guest_price_minor: Math.round(plan.guest_price * 100),
                    included_modules: plan.included_modules,
                    module_price_minor: Math.round(plan.module_price * 100),
                })),
            },
            { onFinish: () => setProcessing(false) },
        );
    };

    return (
        <div>
            <PageHeader
                title="Configuration des prix"
                subtitle="Règles utilisées pour calculer les devis avant la création d’un événement"
            >
                <Button onClick={save} disabled={processing}>
                    <Save className="mr-2 h-4 w-4" />
                    {processing ? 'Enregistrement…' : 'Enregistrer les tarifs'}
                </Button>
            </PageHeader>

            {flash?.success && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {flash.success}
                </div>
            )}
            {Object.keys(errors || {}).length > 0 && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Vérifiez les valeurs saisies avant d’enregistrer.
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-3">
                {form.map((plan) => (
                    <Card key={plan.slug}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-primary" />
                                {plan.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div>
                                <Label>Prix de base ({plan.currency})</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={plan.base_price}
                                    onChange={(event) =>
                                        update(
                                            plan.slug,
                                            'base_price',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                            </div>
                            <div className="rounded-xl border p-4">
                                <div className="mb-3 flex items-center gap-2 font-semibold">
                                    <Users className="h-4 w-4 text-primary" />
                                    Invités
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <div>
                                        <Label>Invités inclus</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={plan.max_guests}
                                            onChange={(event) =>
                                                update(
                                                    plan.slug,
                                                    'max_guests',
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label>Prix par invité en plus</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={plan.guest_price}
                                            onChange={(event) =>
                                                update(
                                                    plan.slug,
                                                    'guest_price',
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border p-4">
                                <div className="mb-3 font-semibold">
                                    Modules
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <div>
                                        <Label>Modules inclus</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={plan.included_modules}
                                            onChange={(event) =>
                                                update(
                                                    plan.slug,
                                                    'included_modules',
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label>Prix par module en plus</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={plan.module_price}
                                            onChange={(event) =>
                                                update(
                                                    plan.slug,
                                                    'module_price',
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
