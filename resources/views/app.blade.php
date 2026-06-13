<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link rel="icon" href="/favicon.ico?v=4" sizes="any">
        <link rel="icon" href="/assets/icons/icon-192.png?v=4" type="image/png" sizes="192x192">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" sizes="180x180">
        <link rel="manifest" href="/manifest.webmanifest?v=4">
        <meta name="theme-color" content="#8b1e1e">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
