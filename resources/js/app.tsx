import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/layout/AppLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Instantiate the QueryClient
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

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
            </QueryClientProvider>
        );
    },

    progress: {
        color: '#4B5563',
    },
});
