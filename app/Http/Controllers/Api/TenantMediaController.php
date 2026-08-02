<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use App\Models\Event;
use App\Models\MediaAlbum;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenantMediaController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeMedia($event, 'media.view');
        $albums = MediaAlbum::query()->where('event_id', $event->id)->withCount('photos')->orderBy('sort_order')->get();
        $photos = PhotoModel::query()->where('event_id', $event->id)->latest()->get()->map(fn ($photo) => [
            ...$photo->toArray(),
            'content_url' => route('tenant-media.content', [$organization, $event, $photo]),
        ]);

        return response()->json(['data' => ['albums' => $albums, 'photos' => $photos, 'summary' => [
            'total' => $photos->count(), 'published' => $photos->where('status', 'published')->count(),
            'featured' => $photos->where('is_featured', true)->count(),
        ]]]);
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
            'file' => ['required', 'image', 'max:15360'],
            'media_album_id' => ['nullable', 'uuid', Rule::exists('media_albums', 'id')->where('event_id', $event->id)],
            'caption' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', Rule::in(['ceremony', 'reception', 'portraits', 'candid', 'details', 'other'])],
        ]);
        $file = $request->file('file');
        $path = $file->store("organizations/{$organization->id}/events/{$event->id}/media", 'local');
        $photo = PhotoModel::query()->create([
            'wedding_id' => $event->legacy_wedding_id, 'organization_id' => $organization->id, 'event_id' => $event->id,
            'media_album_id' => $data['media_album_id'] ?? null, 'url' => '', 'caption' => $data['caption'] ?? null,
            'category' => $data['category'] ?? 'other', 'uploaded_by' => $request->user()->id,
            'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(),
            'visibility' => 'team', 'status' => 'draft',
        ]);

        return response()->json(['data' => $photo], Response::HTTP_CREATED);
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
}
