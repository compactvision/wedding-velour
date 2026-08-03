import { createInertiaApp } from '@inertiajs/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/layout/AppLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import BrandLogo from './components/shared/BrandLogo';
import ServiceWorkerUpdateToast from './components/shared/ServiceWorkerUpdateToast';

const appName = import.meta.env.VITE_APP_NAME || 'Planivo';
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

function notifyServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
    window.dispatchEvent(
        new CustomEvent('pwa-update-ready', {
            detail: { registration },
        }),
    );
}

function watchServiceWorker(registration: ServiceWorkerRegistration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
        notifyServiceWorkerUpdate(registration);
    }

    registration.addEventListener('updatefound', () => {
        const worker = registration.installing;

        if (!worker) {
            return;
        }

        worker.addEventListener('statechange', () => {
            if (
                worker.state === 'installed' &&
                registration.waiting &&
                navigator.serviceWorker.controller
            ) {
                notifyServiceWorkerUpdate(registration);
            }
        });
    });
}

if (isBrowser && !isSandboxedPreview && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        try {
            if ('serviceWorker' in navigator) {
                let refreshing = false;
                navigator.serviceWorker.addEventListener(
                    'controllerchange',
                    () => {
                        if (refreshing) {
                            return;
                        }

                        refreshing = true;
                        window.location.reload();
                    },
                );

                void navigator.serviceWorker
                    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
                    .then((registration) => {
                        watchServiceWorker(registration);
                        void registration.update();
                        window.setInterval(
                            () => {
                                void registration.update();
                            },
                            60 * 60 * 1000,
                        );
                    });
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
                    Ouvrir Planivo
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
            const superAdminPages = [
                'SuperAdminDashboard',
                'SuperAdminEventTypes',
                'SuperAdminUsers',
                'SuperAdminTransactions',
                'PricingSettings',
            ];

            const nonAdminPages = [
                'welcome',
                'Invitation',
                'GuestPortal',
                'ServerInterface',
                'DoorAgent',
                'TableMenu',
                'PublicGallery',
                'Onboarding',
                'PaymentFailed',
                'PaymentSuccess',
                'TeamInvitation',
                'auth/Login',
            ];

            if (superAdminPages.includes(name)) {
                component.layout =
                    component.layout ||
                    ((p: any) => <SuperAdminLayout>{p}</SuperAdminLayout>);
            } else if (
                !nonAdminPages.includes(name) &&
                !name.startsWith('auth/')
            ) {
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
                    <ServiceWorkerUpdateToast />
                </QueryClientProvider>,
            );
        },

        progress: {
            color: '#4B5563',
        },
    });
}
