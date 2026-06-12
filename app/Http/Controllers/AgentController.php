<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AgentController extends Controller
{
    private const ROLES = ['admin', 'manager', 'server', 'door'];

    public function index(): JsonResponse
    {
        return response()->json(
            User::query()
                ->select(['id', 'name', 'email', 'role', 'wedding_id', 'is_active', 'created_at'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ROLES)],
            'wedding_id' => ['nullable', 'uuid', 'exists:weddings,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $agent = User::create($data);

        return response()->json($agent->only([
            'id', 'name', 'email', 'role', 'wedding_id', 'is_active', 'created_at',
        ]), 201);
    }

    public function update(Request $request, User $agent): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($agent->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'required', Rule::in(self::ROLES)],
            'wedding_id' => ['nullable', 'uuid', 'exists:weddings,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $agent->update($data);

        return response()->json($agent->only([
            'id', 'name', 'email', 'role', 'wedding_id', 'is_active', 'created_at',
        ]));
    }

    public function destroy(Request $request, User $agent): JsonResponse
    {
        abort_if($request->user()->is($agent), 422, 'Vous ne pouvez pas supprimer votre propre compte.');
        $agent->delete();

        return response()->json(['success' => true]);
    }
}
