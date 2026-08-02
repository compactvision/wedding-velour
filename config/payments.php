<?php

return [
    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
    'default_provider' => env('PAYMENT_DEFAULT_PROVIDER', 'sandbox'),
];
