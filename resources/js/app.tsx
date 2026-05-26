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
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });
        const page: any = (pages[`./pages/${name}.tsx`] as any).default;
        
        // Dynamic persistent layout for admin pages
        const nonAdminPages = ['welcome', 'Invitation', 'GuestPortal', 'ServerInterface', 'DoorAgent', 'TableMenu'];
        if (!nonAdminPages.includes(name)) {
            page.layout = page.layout || ((p: any) => <AppLayout children={p} />);
        }
        
        return page;
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
