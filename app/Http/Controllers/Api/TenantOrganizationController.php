<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TenantOrganizationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $organizations = Organization::query()
            ->where('status', 'active')
            ->where(function ($query) use ($user) {
                $query->where('owner_user_id', $user->id)
                    ->orWhereHas('members', fn ($members) => $members
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            })
            ->orderBy('name')
            ->paginate(25);

        return OrganizationResource::collection($organizations);
    }
}
