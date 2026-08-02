<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitation_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_type_id');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->json('configuration');
            $table->boolean('is_default')->default(false);
            $table->string('status', 20)->default('active')->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('event_type_id')->references('id')->on('event_types')->cascadeOnDelete();
            $table->unique(['event_type_id', 'slug']);
        });

        $templates = [
            'wedding' => [
                ['elegant', 'Élégance romantique', 'Une invitation chaleureuse et raffinée.', true, [
                    'eyebrow' => 'Ensemble pour la vie',
                    'greeting' => 'Cher(e) {guest}',
                    'body' => 'C’est avec une immense joie que nous vous invitons à célébrer notre union. Votre présence rendra cette journée encore plus précieuse.',
                    'rsvp_question' => 'Serez-vous à nos côtés pour célébrer notre mariage ?',
                    'accept_label' => 'Oui, avec grand plaisir',
                    'decline_label' => 'Je ne pourrai pas être présent(e)',
                    'footer' => 'Avec toute notre affection',
                    'accent_color' => '#B98235',
                ]],
                ['tradition', 'Union traditionnelle', 'Un texte solennel pour réunir les familles.', false, [
                    'eyebrow' => 'Deux familles, une même histoire',
                    'greeting' => 'Cher(e) {guest}',
                    'body' => 'Nos familles ont l’honneur de vous convier à la célébration de notre union. Venez partager avec nous ce moment de tradition, de joie et de communion.',
                    'rsvp_question' => 'Aurons-nous le plaisir de vous accueillir ?',
                    'accept_label' => 'Je serai présent(e)',
                    'decline_label' => 'Je ne pourrai pas venir',
                    'footer' => 'Nos familles vous remercient',
                    'accent_color' => '#8A4B2A',
                ]],
                ['minimal', 'Oui, simplement', 'Un contenu moderne, intime et direct.', false, [
                    'eyebrow' => 'Nous nous marions',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'Nous avons choisi de nous dire oui et nous aimerions vivre ce moment avec vous. Rejoignez-nous pour une journée simple, belle et inoubliable.',
                    'rsvp_question' => 'Vous joindrez-vous à nous ?',
                    'accept_label' => 'Oui, je viens',
                    'decline_label' => 'Je ne serai pas disponible',
                    'footer' => 'On a hâte de vous retrouver',
                    'accent_color' => '#6F7C68',
                ]],
            ],
            'birthday' => [
                ['celebration', 'Joyeux anniversaire', 'Une invitation festive et conviviale.', true, [
                    'eyebrow' => 'Une nouvelle bougie à célébrer',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'Une belle fête se prépare et votre présence ferait toute la différence. Venez partager les sourires, la musique et les souvenirs de cet anniversaire.',
                    'rsvp_question' => 'Serez-vous de la fête ?',
                    'accept_label' => 'Oui, je viens faire la fête',
                    'decline_label' => 'Je ne pourrai pas venir',
                    'footer' => 'Préparez-vous à célébrer',
                    'accent_color' => '#D66F7A',
                ]],
            ],
            'private-party' => [
                ['soiree', 'Soirée privée', 'Un ton complice pour une réception privée.', true, [
                    'eyebrow' => 'Vous êtes sur la liste',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'Nous préparons une soirée privée et serions ravis de vous compter parmi nous. Musique, rencontres et beaux moments seront au rendez-vous.',
                    'rsvp_question' => 'Confirmez-vous votre présence ?',
                    'accept_label' => 'Je serai là',
                    'decline_label' => 'Je passe mon tour',
                    'footer' => 'À très vite',
                    'accent_color' => '#7C5C9E',
                ]],
            ],
            'conference' => [
                ['professional', 'Invitation professionnelle', 'Un message clair pour participants et partenaires.', true, [
                    'eyebrow' => 'Invitation professionnelle',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'Nous avons le plaisir de vous inviter à cet événement consacré aux échanges, aux idées et aux nouvelles opportunités. Votre participation enrichira les discussions.',
                    'rsvp_question' => 'Participerez-vous à cette rencontre ?',
                    'accept_label' => 'Je confirme ma participation',
                    'decline_label' => 'Je ne serai pas disponible',
                    'footer' => 'Au plaisir de vous accueillir',
                    'accent_color' => '#2E7392',
                ]],
            ],
            'corporate-event' => [
                ['corporate', 'Événement d’entreprise', 'Une invitation institutionnelle et accueillante.', true, [
                    'eyebrow' => 'Rencontrons-nous',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'Nous serions heureux de vous accueillir à cet événement professionnel pensé pour partager notre vision, créer des liens et ouvrir de nouvelles perspectives.',
                    'rsvp_question' => 'Pouvez-vous confirmer votre participation ?',
                    'accept_label' => 'Je participerai',
                    'decline_label' => 'Je ne suis pas disponible',
                    'footer' => 'Cordialement',
                    'accent_color' => '#4D6B57',
                ]],
            ],
            'concert' => [
                ['live', 'Rendez-vous live', 'Une invitation énergique pour un concert ou spectacle.', true, [
                    'eyebrow' => 'Vivez la scène avec nous',
                    'greeting' => 'Bonjour {guest}',
                    'body' => 'La scène s’allume bientôt. Rejoignez-nous pour une expérience live portée par la musique, l’énergie et des moments à vivre ensemble.',
                    'rsvp_question' => 'Serez-vous dans le public ?',
                    'accept_label' => 'Oui, j’y serai',
                    'decline_label' => 'Je ne pourrai pas venir',
                    'footer' => 'Rendez-vous devant la scène',
                    'accent_color' => '#C14E39',
                ]],
            ],
            'memorial' => [
                ['memory', 'En mémoire', 'Un message sobre, digne et respectueux.', true, [
                    'eyebrow' => 'En souvenir d’une vie précieuse',
                    'greeting' => 'Cher(e) {guest}',
                    'body' => 'Nous vous invitons à vous joindre à nous pour honorer sa mémoire, partager nos souvenirs et nous recueillir ensemble dans la dignité et l’affection.',
                    'rsvp_question' => 'Pourrez-vous être parmi nous ?',
                    'accept_label' => 'Je serai présent(e)',
                    'decline_label' => 'Je ne pourrai pas être présent(e)',
                    'footer' => 'Avec nos sincères remerciements',
                    'accent_color' => '#667085',
                ]],
            ],
        ];

        $now = now();
        foreach ($templates as $eventTypeSlug => $items) {
            $eventTypeId = DB::table('event_types')->where('slug', $eventTypeSlug)->value('id');
            if (! $eventTypeId) {
                continue;
            }
            foreach ($items as $sortOrder => [$slug, $name, $description, $isDefault, $configuration]) {
                DB::table('invitation_templates')->insert([
                    'id' => (string) Str::uuid(),
                    'event_type_id' => $eventTypeId,
                    'name' => $name,
                    'slug' => $slug,
                    'description' => $description,
                    'configuration' => json_encode($configuration, JSON_THROW_ON_ERROR),
                    'is_default' => $isDefault,
                    'status' => 'active',
                    'sort_order' => $sortOrder,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        foreach ([
            'essential' => [3, 150],
            'standard' => [6, 100],
            'premium' => [10, 50],
        ] as $planSlug => [$includedModules, $amountMinor]) {
            $planId = DB::table('plans')->where('slug', $planSlug)->value('id');
            if (! $planId) {
                continue;
            }
            DB::table('pricing_rules')->insert([
                'id' => (string) Str::uuid(),
                'plan_id' => $planId,
                'name' => 'Modules optionnels sélectionnés',
                'status' => 'active',
                'condition' => json_encode([
                    'metric' => 'enabled_modules',
                    'included_quantity' => $includedModules,
                ], JSON_THROW_ON_ERROR),
                'operation' => 'per_unit',
                'amount_minor' => $amountMinor,
                'unit_name' => 'module',
                'priority' => 80,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('pricing_rules')->where('name', 'Modules optionnels sélectionnés')->delete();
        Schema::dropIfExists('invitation_templates');
    }
};
