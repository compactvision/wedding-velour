<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use App\Models\Event;
use App\Models\MediaAlbum;
use App\Models\MediaGalleryLink;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenantMediaController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeMedia($event, 'media.view');
        $albums = MediaAlbum::query()->where('event_id', $event->id)->withCount('photos')->orderBy('sort_order')->get();
        $photos = PhotoModel::query()->where('event_id', $event->id)->with('album:id,name')->latest()->get()->map(fn ($photo) => [
            ...$photo->toArray(),
            'album' => $photo->album?->name,
            'is_video' => str_starts_with((string) $photo->mime_type, 'video/'),
            'content_url' => route('tenant-media.content', [$organization, $event, $photo]),
        ]);
        $usedBytes = (int) PhotoModel::query()->where('event_id', $event->id)->sum('size_bytes');
        $limitBytes = $this->storageLimitBytes($event);
        $gallery = MediaGalleryLink::query()->where('event_id', $event->id)->first();

        return response()->json(['data' => ['albums' => $albums, 'photos' => $photos, 'summary' => [
            'total' => $photos->count(), 'published' => $photos->where('status', 'published')->count(),
            'featured' => $photos->where('is_featured', true)->count(),
            'used_bytes' => $usedBytes, 'limit_bytes' => $limitBytes,
            'remaining_bytes' => max(0, $limitBytes - $usedBytes),
        ], 'gallery' => $gallery ? [
            'is_active' => $gallery->is_active,
            'allow_downloads' => $gallery->allow_downloads,
            'share_url' => route('public-gallery.show', $gallery->token),
        ] : null]]);
    }

    public function storeAlbum(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeMedia($event, 'media.manage');
        $album = MediaAlbum::query()->create([
            ...$request->validate(['name' => ['required', 'string', 'max:120'], 'description' => ['nullable', 'string', 'max:1000']]),
            'organization_id' => $organization->id, 'event_id' => $event->id,
        ]);

        return response()->json(['data' => $album], Response::HTTP_CREATED);
    }

    public function store(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeMedia($event, 'media.manage');
        $data = $request->validate([
            'file' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm',
                'max:'.config('filesystems.media_max_file_kb'),
            ],
            'media_album_id' => ['nullable', 'uuid', Rule::exists('media_albums', 'id')->where('event_id', $event->id)],
            'caption' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', Rule::in(['ceremony', 'reception', 'portraits', 'candid', 'details', 'other'])],
        ]);
        $file = $request->file('file');
        $fileSize = (int) $file->getSize();
        $disk = (string) config('filesystems.media_disk', 'local');
        $path = null;
        try {
            $photo = DB::transaction(function () use ($event, $organization, $request, $data, $file, $fileSize, $disk, &$path) {
                Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
                $usedBytes = (int) PhotoModel::query()->where('event_id', $event->id)->sum('size_bytes');
                $limitBytes = $this->storageLimitBytes($event);
                if ($limitBytes <= 0) {
                    throw ValidationException::withMessages([
                        'file' => 'Activez un pack disposant d’un espace de stockage avant d’ajouter des médias.',
                    ]);
                }
                if ($usedBytes + $fileSize > $limitBytes) {
                    throw ValidationException::withMessages([
                        'file' => 'Ce fichier dépasse l’espace de stockage restant pour cet événement.',
                    ]);
                }

                $path = $file->store("organizations/{$organization->id}/events/{$event->id}/media", $disk);
                abort_unless(is_string($path) && $path !== '', 500, 'Le média n’a pas pu être enregistré.');

                return PhotoModel::query()->create([
                    'wedding_id' => $event->legacy_wedding_id, 'organization_id' => $organization->id, 'event_id' => $event->id,
                    'media_album_id' => $data['media_album_id'] ?? null, 'url' => '', 'caption' => $data['caption'] ?? null,
                    'category' => $data['category'] ?? 'other', 'uploaded_by' => $request->user()->id,
                    'disk' => $disk, 'path' => $path, 'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(), 'size_bytes' => $fileSize,
                    'visibility' => 'team', 'status' => 'draft',
                ]);
            });
        } catch (\Throwable $exception) {
            if (is_string($path) && $path !== '') {
                Storage::disk($disk)->delete($path);
            }

            throw $exception;
        }

        return response()->json(['data' => $photo], Response::HTTP_CREATED);
    }

    public function galleryLink(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeMedia($event, 'media.publish');
        $data = $request->validate([
            'allow_downloads' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'regenerate' => ['sometimes', 'boolean'],
        ]);
        $gallery = MediaGalleryLink::query()->where('event_id', $event->id)->first();
        $token = ! $gallery || ($data['regenerate'] ?? false)
            ? Str::random(64)
            : $gallery->token;
        $gallery = MediaGalleryLink::query()->updateOrCreate(
            ['event_id' => $event->id],
            [
                'organization_id' => $organization->id,
                'created_by_user_id' => $request->user()->id,
                'token' => $token,
                'is_active' => $data['is_active'] ?? true,
                'allow_downloads' => $data['allow_downloads'] ?? $gallery?->allow_downloads ?? true,
            ],
        );

        return response()->json(['data' => [
            'is_active' => $gallery->is_active,
            'allow_downloads' => $gallery->allow_downloads,
            'share_url' => route('public-gallery.show', $gallery->token),
        ]], $gallery->wasRecentlyCreated ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    public function update(Request $request, Organization $organization, Event $event, PhotoModel $photo): JsonResponse
    {
        $this->assertScope($photo, $organization, $event);
        $data = $request->validate([
            'caption' => ['sometimes', 'nullable', 'string', 'max:500'], 'is_featured' => ['sometimes', 'boolean'],
            'media_album_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('media_albums', 'id')->where('event_id', $event->id)],
            'action' => ['sometimes', Rule::in(['publish', 'unpublish'])],
        ]);
        $permission = isset($data['action']) ? 'media.publish' : 'media.manage';
        $this->authorizeMedia($event, $permission);
        if (($data['action'] ?? null) === 'publish') {
            $data = [...$data, 'status' => 'published', 'published_at' => now()];
        }
        if (($data['action'] ?? null) === 'unpublish') {
            $data = [...$data, 'status' => 'draft', 'published_at' => null];
        }
        unset($data['action']);
        $photo->update($data);

        return response()->json(['data' => $photo->fresh()]);
    }

    public function content(Organization $organization, Event $event, PhotoModel $photo): StreamedResponse
    {
        $this->authorizeMedia($event, 'media.view');
        $this->assertScope($photo, $organization, $event);
        abort_unless($photo->path && Storage::disk($photo->disk)->exists($photo->path), 404);

        return Storage::disk($photo->disk)->response($photo->path, null, ['Content-Type' => $photo->mime_type]);
    }

    public function destroy(Organization $organization, Event $event, PhotoModel $photo): Response
    {
        $this->authorizeMedia($event, 'media.manage');
        $this->assertScope($photo, $organization, $event);
        if ($photo->path) {
            Storage::disk($photo->disk)->delete($photo->path);
        }
        $photo->delete();

        return response()->noContent();
    }

    private function authorizeMedia(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id && $context->allows($permission), 403);
        abort_unless($event->enabledModules()->whereIn('modules.slug', ['media', 'gallery'])->wherePivot('status', 'enabled')->exists(), 404);
    }

    private function assertScope(PhotoModel $photo, Organization $organization, Event $event): void
    {
        abort_unless($photo->organization_id === $organization->id && $photo->event_id === $event->id, 404);
    }

    private function storageLimitBytes(Event $event): int
    {
        $subscription = $event->subscriptions()
            ->where('active_marker', true)
            ->where('status', 'active')
            ->first();
        $storageGb = max(0, (int) data_get($subscription?->plan_snapshot, 'limits.storage_gb', 0));

        return $storageGb * 1024 * 1024 * 1024;
    }
}
