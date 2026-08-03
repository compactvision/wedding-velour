import { Head } from '@inertiajs/react';
import { CalendarDays, Download, Film, Images } from 'lucide-react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';

type Media = {
    id: string;
    caption: string | null;
    mime_type: string;
    is_featured: boolean;
    album: string | null;
    content_url: string;
    download_url: string | null;
};

type Props = {
    gallery: {
        event_name: string;
        event_date: string | null;
        organization_name: string;
        allow_downloads: boolean;
        media_count: number;
    };
    media: Media[];
};

export default function PublicGallery({ gallery, media }: Props) {
    return (
        <div className="min-h-screen bg-[#f8f5ef] text-stone-900">
            <Head title={`Galerie · ${gallery.event_name}`} />
            <header className="border-b border-stone-200/80 bg-white/80 px-5 py-4 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <BrandLogo variant="full" className="h-12 w-36" />
                    <div className="text-right text-xs text-stone-500">
                        <p>{gallery.organization_name}</p>
                        <p>{gallery.media_count} média(s)</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <section className="mb-10 text-center">
                    <p className="text-xs font-bold tracking-[0.22em] text-amber-700 uppercase">
                        Souvenirs partagés
                    </p>
                    <h1 className="mt-3 font-display text-4xl font-semibold sm:text-6xl">
                        {gallery.event_name}
                    </h1>
                    {gallery.event_date && (
                        <p className="mt-4 inline-flex items-center gap-2 text-sm text-stone-500">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(gallery.event_date).toLocaleDateString(
                                'fr-FR',
                                { dateStyle: 'long' },
                            )}
                        </p>
                    )}
                </section>

                {media.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
                        <Images className="mx-auto h-10 w-10 text-stone-400" />
                        <h2 className="mt-4 text-xl font-semibold">
                            La galerie sera bientôt disponible
                        </h2>
                        <p className="mt-2 text-sm text-stone-500">
                            Les organisateurs n’ont pas encore publié de médias.
                        </p>
                    </div>
                ) : (
                    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                        {media.map((item) => {
                            const video = item.mime_type?.startsWith('video/');
                            return (
                                <article
                                    key={item.id}
                                    className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-stone-900 shadow-sm"
                                >
                                    {video ? (
                                        <video
                                            src={item.content_url}
                                            controls
                                            preload="metadata"
                                            className="w-full"
                                        />
                                    ) : (
                                        <img
                                            src={item.content_url}
                                            alt={
                                                item.caption ||
                                                gallery.event_name
                                            }
                                            loading="lazy"
                                            className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
                                        />
                                    )}
                                    {video && (
                                        <span className="absolute top-3 left-3 rounded-full bg-black/60 p-2 text-white">
                                            <Film className="h-4 w-4" />
                                        </span>
                                    )}
                                    {(item.caption || item.download_url) && (
                                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16 text-white">
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {item.caption}
                                                </p>
                                                {item.album && (
                                                    <p className="mt-1 text-xs text-white/60">
                                                        {item.album}
                                                    </p>
                                                )}
                                            </div>
                                            {item.download_url && (
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    asChild
                                                >
                                                    <a
                                                        href={item.download_url}
                                                        aria-label="Télécharger"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
