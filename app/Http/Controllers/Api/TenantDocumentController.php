<?php

namespace App\Http\Controllers\Api;

use App\Application\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Models\DocumentVersion;
use App\Models\Event;
use App\Models\EventDocument;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenantDocumentController extends Controller
{
    public function index(Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeDocuments($event, 'documents.view');
        $documents = EventDocument::query()->where('event_id', $event->id)
            ->with(['versions' => fn ($query) => $query->latest('version_number')])
            ->latest()->get();

        return response()->json(['data' => [
            'summary' => [
                'document_count' => $documents->count(),
                'total_size_bytes' => $documents->flatMap(fn ($document) => $document->versions)->sum('size_bytes'),
                'contract_count' => $documents->where('category', 'contract')->count(),
                'invoice_count' => $documents->where('category', 'invoice')->count(),
            ],
            'documents' => $documents->map(fn (EventDocument $document) => $this->serialize($document)),
        ]]);
    }

    public function store(Request $request, Organization $organization, Event $event): JsonResponse
    {
        $this->authorizeDocuments($event, 'documents.manage');
        $data = $this->validateUpload($request);
        $document = DB::transaction(function () use ($data, $request, $organization, $event) {
            $document = EventDocument::query()->create([
                'organization_id' => $organization->id,
                'event_id' => $event->id,
                'title' => $data['title'],
                'category' => $data['category'],
                'visibility' => $data['visibility'] ?? 'team',
                'description' => $data['description'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]);
            $this->persistVersion($document, $request, 1);

            return $document->load('versions');
        });

        return response()->json(['data' => $this->serialize($document)], Response::HTTP_CREATED);
    }

    public function storeVersion(
        Request $request,
        Organization $organization,
        Event $event,
        EventDocument $eventDocument,
    ): JsonResponse {
        $this->authorizeDocuments($event, 'documents.manage');
        $this->assertScope($eventDocument, $organization, $event);
        $request->validate(['file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg']]);
        $number = (int) $eventDocument->versions()->max('version_number') + 1;
        $version = $this->persistVersion($eventDocument, $request, $number);

        return response()->json(['data' => $version], Response::HTTP_CREATED);
    }

    public function download(
        Organization $organization,
        Event $event,
        EventDocument $eventDocument,
        DocumentVersion $documentVersion,
    ): StreamedResponse {
        $this->authorizeDocuments($event, 'documents.download');
        $this->assertScope($eventDocument, $organization, $event);
        abort_unless($documentVersion->event_document_id === $eventDocument->id, 404);
        abort_unless(Storage::disk($documentVersion->disk)->exists($documentVersion->path), 404);

        return Storage::disk($documentVersion->disk)->download($documentVersion->path, $documentVersion->original_name);
    }

    public function destroy(
        Organization $organization,
        Event $event,
        EventDocument $eventDocument,
    ): Response {
        $this->authorizeDocuments($event, 'documents.manage');
        $this->assertScope($eventDocument, $organization, $event);
        $eventDocument->load('versions');
        foreach ($eventDocument->versions as $version) {
            Storage::disk($version->disk)->delete($version->path);
        }
        $eventDocument->delete();

        return response()->noContent();
    }

    private function persistVersion(EventDocument $document, Request $request, int $number): DocumentVersion
    {
        $file = $request->file('file');
        $path = $file->store("organizations/{$document->organization_id}/events/{$document->event_id}/documents/{$document->id}", 'local');

        return DocumentVersion::query()->create([
            'event_document_id' => $document->id,
            'version_number' => $number,
            'disk' => 'local',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'checksum_sha256' => hash_file('sha256', $file->getRealPath()),
            'uploaded_by_user_id' => $request->user()->id,
        ]);
    }

    private function validateUpload(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'category' => ['required', Rule::in(['contract', 'quote', 'invoice', 'plan', 'permit', 'other'])],
            'visibility' => ['sometimes', Rule::in(['team', 'finance', 'private'])],
            'description' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
        ]);
    }

    private function serialize(EventDocument $document): array
    {
        return [
            'id' => $document->id, 'title' => $document->title, 'category' => $document->category,
            'visibility' => $document->visibility, 'description' => $document->description,
            'versions' => $document->versions->map(fn (DocumentVersion $version) => [
                'id' => $version->id, 'version_number' => $version->version_number,
                'original_name' => $version->original_name, 'mime_type' => $version->mime_type,
                'size_bytes' => $version->size_bytes, 'created_at' => $version->created_at?->toIso8601String(),
            ])->values(),
        ];
    }

    private function authorizeDocuments(Event $event, string $permission): void
    {
        $context = app(TenantContext::class);
        abort_unless($context->eventId === $event->id && $context->allows($permission), 403);
        abort_unless($event->enabledModules()->where('modules.slug', 'documents')->wherePivot('status', 'enabled')->exists(), 404);
    }

    private function assertScope(EventDocument $document, Organization $organization, Event $event): void
    {
        abort_unless($document->organization_id === $organization->id && $document->event_id === $event->id, 404);
    }
}
