<?php

namespace App\Http\Controllers;

use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use App\Models\MediaGalleryLink;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicGalleryController extends Controller
{
    public function show(string $token): Response
    {
        $gallery = $this->gallery($token);
        $media = PhotoModel::query()
            ->where('event_id', $gallery->event_id)
            ->where('status', 'published')
            ->with('album:id,name')
            ->orderByDesc('is_featured')
            ->latest('published_at')
            ->get()
            ->map(fn (PhotoModel $photo) => [
                'id' => $photo->id,
                'caption' => $photo->caption,
                'category' => $photo->category,
                'mime_type' => $photo->mime_type,
                'original_name' => $photo->original_name,
                'size_bytes' => $photo->size_bytes,
                'is_featured' => $photo->is_featured,
                'album' => $photo->album?->name,
                'content_url' => route('public-gallery.content', [$token, $photo]),
                'download_url' => $gallery->allow_downloads
                    ? route('public-gallery.download', [$token, $photo])
                    : null,
            ]);

        return Inertia::render('PublicGallery', [
            'gallery' => [
                'event_name' => $gallery->event->name,
                'event_date' => $gallery->event->starts_at?->toIso8601String(),
                'organization_name' => $gallery->organization->name,
                'allow_downloads' => $gallery->allow_downloads,
                'media_count' => $media->count(),
            ],
            'media' => $media,
        ]);
    }

    public function content(string $token, PhotoModel $photo): StreamedResponse
    {
        $gallery = $this->gallery($token);
        $this->assertPublishedMedia($gallery, $photo);

        return Storage::disk($photo->disk)->response(
            $photo->path,
            null,
            ['Content-Type' => $photo->mime_type, 'Cache-Control' => 'private, max-age=3600'],
        );
    }

    public function download(string $token, PhotoModel $photo): StreamedResponse
    {
        $gallery = $this->gallery($token);
        abort_unless($gallery->allow_downloads, 403);
        $this->assertPublishedMedia($gallery, $photo);
        $name = $photo->original_name ?: 'planivo-'.$photo->id.'.'.pathinfo((string) $photo->path, PATHINFO_EXTENSION);
        $name = preg_replace('/[^A-Za-z0-9._-]+/', '-', $name) ?: 'media-planivo';

        return Storage::disk($photo->disk)->download($photo->path, $name, [
            'Content-Type' => $photo->mime_type,
        ]);
    }

    private function gallery(string $token): MediaGalleryLink
    {
        return MediaGalleryLink::query()
            ->where('token', $token)
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->with(['event:id,organization_id,name,starts_at', 'organization:id,name'])
            ->firstOrFail();
    }

    private function assertPublishedMedia(MediaGalleryLink $gallery, PhotoModel $photo): void
    {
        abort_unless($photo->event_id === $gallery->event_id && $photo->status === 'published', 404);
        abort_unless($photo->path && Storage::disk($photo->disk)->exists($photo->path), 404);
    }
}
