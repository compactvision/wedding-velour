import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/layout/AppLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BrandLogo from './components/shared/BrandLogo';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const isBrowser =
    typeof window !== 'undefined' && typeof document !== 'undefined';
const appElement = isBrowser ? document.getElementById('app') : null;
const initialPage = appElement?.dataset.page
    ? JSON.parse(appElement.dataset.page)
    : null;
const configuredAppUrl = initialPage?.props?.app_url;
const isSandboxedPreview =
    isBrowser &&
    (window.location.origin === 'null' ||
        !['http:', 'https:'].includes(window.location.protocol));

if (isBrowser && !isSandboxedPreview && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        try {
            if ('serviceWorker' in navigator) {
                void navigator.serviceWorker.register('/sw.js');
            }
        } catch {
            // Sandboxed previews can throw when merely reading navigator.serviceWorker.
        }
    });
}

// Instantiate the QueryClient
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

if (!isBrowser || !appElement) {
    // Vite imports this client entry while warming the Inertia SSR graph.
} else if (isSandboxedPreview) {
    const root = createRoot(appElement!);
    const targetUrl =
        typeof configuredAppUrl === 'string' &&
        configuredAppUrl.startsWith('https://')
            ? configuredAppUrl
            : 'https://wedding-velour.maliyaflow.com';

    root.render(
        <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
            <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <BrandLogo variant="full" className="mx-auto mb-4 h-36 w-64" />
                <h1 className="font-display text-2xl font-semibold text-stone-800">
                    Ouvrir Wedding Velour
                </h1>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                    Cet aperçu sécurisé bloque les sessions, la navigation et le
                    mode hors ligne. Ouvrez l’application directement pour
                    utiliser toutes ses fonctions.
                </p>
                <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                >
                    Ouvrir l’application
                </a>
            </div>
        </div>,
    );
} else {
    createInertiaApp({
        title: (title) => (title ? `${title} - ${appName}` : appName),

        resolve: async (name) => {
            const pages = import.meta.glob('./pages/**/*.tsx');

            const resolvePage = pages[`./pages/${name}.tsx`];

            if (!resolvePage) {
                throw new Error(`Page not found: ${name}`);
            }

            const page: any = await resolvePage();
            const component = page.default;

            const nonAdminPages = [
                'welcome',
                'Invitation',
                'GuestPortal',
                'ServerInterface',
                'DoorAgent',
                'TableMenu',
                'auth/Login',
            ];

            if (!nonAdminPages.includes(name)) {
                component.layout =
                    component.layout ||
                    ((p: any) => <AppLayout children={p} />);
            }

            return component;
        },

        setup({ el, App, props }) {
            const root = createRoot(el);

            root.render(
                <QueryClientProvider client={queryClient}>
                    <App {...props} />
                </QueryClientProvider>,
            );
        },

        progress: {
            color: '#4B5563',
        },
    });
}
