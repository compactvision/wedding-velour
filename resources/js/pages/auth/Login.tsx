import React, { FormEvent, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Heart, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const { errors } = usePage().props as any;
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [processing, setProcessing] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    router.post('/login', form, {
      preserveScroll: true,
      onFinish: () => setProcessing(false),
    });
  };

  return (
    <>
      <Head title="Connexion" />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-950 via-stone-900 to-primary/40 px-4">
        <Card className="w-full max-w-md border-white/10 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Heart className="h-7 w-7 text-primary" fill="currentColor" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">Espace équipe</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Connectez-vous avec le compte créé par l’administrateur.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="h-12 pl-10"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </div>
                {errors?.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-12 pl-10"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                />
                Rester connecté
              </label>
              <Button className="h-12 w-full text-base" disabled={processing}>
                {processing ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
