<?php

namespace App\Domain\Wedding\Entities;

class Photo
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $weddingId,
        public string $url,
        public ?string $thumbnailUrl = null,
        public ?string $caption = null,
        public ?string $uploadedBy = null,
        public string $category = 'other',
        public bool $isFeatured = false
    ) {}
}
