<?php

return [
    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
    'default_provider' => env('PAYMENT_DEFAULT_PROVIDER', 'rdcard'),
    'rdcard' => [
        'environment' => env('PG_ENVIRONMENT', 'sandbox'),
        'base_url' => null,
        'base_urls' => [
            'sandbox' => 'https://sandbox.checkout.rdcard.net/api',
            'live' => 'https://checkout.rdcard.net/api',
        ],
        'api_key' => env('PG_API_KEY'),
        'secret' => env('PG_API_SECRET'),
        'service_id' => env('PG_SERVICE_ID'),
    ],
];
