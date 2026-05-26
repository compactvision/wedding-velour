<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:10240', // max 10MB
        ]);

        if ($request->file('file')) {
            $path = $request->file('file')->store('uploads', 'public');
            $url = Storage::disk('public')->url($path);
            
            return response()->json([
                'file_url' => $url,
            ]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }
}
