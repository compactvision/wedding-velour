<?php

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\GuestModel;
use App\Infrastructure\Persistence\Eloquent\MenuItemModel;
use App\Infrastructure\Persistence\Eloquent\OrderModel;
use App\Infrastructure\Persistence\Eloquent\PhotoModel;
use App\Infrastructure\Persistence\Eloquent\TimelineEventModel;
use App\Infrastructure\Persistence\Eloquent\WeddingModel;
use App\Infrastructure\Persistence\Eloquent\WeddingNotificationModel;
use App\Infrastructure\Persistence\Eloquent\WeddingTableModel;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Disable foreign keys & truncate all relevant tables
        Schema::disableForeignKeyConstraints();
        User::truncate();
        WeddingModel::truncate();
        WeddingTableModel::truncate();
        GuestModel::truncate();
        MenuItemModel::truncate();
        OrderModel::truncate();
        TimelineEventModel::truncate();
        PhotoModel::truncate();
        WeddingNotificationModel::truncate();
        Schema::enableForeignKeyConstraints();

        // 1. Create Default Admin User
        $admin = User::create([
            'name' => 'Elikia Mutombo',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        // 2. Create Wedding
        $weddingId = 'caa86ae6-a175-4644-8c8d-a8d457687118'; // fixed ID
        $wedding = WeddingModel::create([
            'id' => $weddingId,
            'title' => 'Mariage d\'Elikia & Merveille',
            'date' => '2026-08-15',
            'venue' => 'Palais du Fleuve (Grand Hôtel)',
            'venue_address' => 'Avenue de la Justice, Gombe, Kinshasa, RDC',
            'cover_image' => 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
            'status' => 'planning',
            'max_guests' => 150,
            'notes' => 'Mariage premium célébrant l\'élégance de la Rumba Congolaise et les saveurs locales.',
        ]);

        // 3. Create Tables (Inspired by Congolese Cities and Rumba themes)
        $tablesData = [
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687119', // The exact table ID from the user's first request
                'wedding_id' => $weddingId,
                'name' => 'Table Kinshasa (VIP)',
                'capacity' => 8,
                'position_x' => 180,
                'position_y' => 120,
                'shape' => 'round',
                'assigned_server' => 'Jean',
                'category' => 'vip',
            ],
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687120',
                'wedding_id' => $weddingId,
                'name' => 'Table Lubumbashi',
                'capacity' => 8,
                'position_x' => 380,
                'position_y' => 120,
                'shape' => 'round',
                'assigned_server' => 'Sarah',
                'category' => 'family',
            ],
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687121',
                'wedding_id' => $weddingId,
                'name' => 'Table Goma',
                'capacity' => 10,
                'position_x' => 180,
                'position_y' => 300,
                'shape' => 'rectangle',
                'assigned_server' => 'Jean',
                'category' => 'friends',
            ],
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687122',
                'wedding_id' => $weddingId,
                'name' => 'Table Kisangani',
                'capacity' => 8,
                'position_x' => 380,
                'position_y' => 300,
                'shape' => 'round',
                'assigned_server' => 'Sarah',
                'category' => 'friends',
            ],
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687123',
                'wedding_id' => $weddingId,
                'name' => 'Table Brazzaville',
                'capacity' => 8,
                'position_x' => 580,
                'position_y' => 120,
                'shape' => 'round',
                'assigned_server' => 'Marc',
                'category' => 'family',
            ],
            [
                'id' => 'caa86ae6-a175-4644-8c8d-a8d457687124',
                'wedding_id' => $weddingId,
                'name' => 'Table Pointe-Noire',
                'capacity' => 6,
                'position_x' => 580,
                'position_y' => 300,
                'shape' => 'round',
                'assigned_server' => 'Marc',
                'category' => 'other',
            ],
        ];

        foreach ($tablesData as $t) {
            WeddingTableModel::create($t);
        }

        // 4. Create Menu Items (Inspired by Congolese local drinks and dishes)
        $menuItems = [
            // Drinks (Boissons)
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Bière Primus',
                'emoji' => '🍺',
                'category' => 'drink',
                'description' => 'La bière leader historique de la RDC, brassée à Kinshasa depuis 1923.',
                'available_quantity' => 120,
                'remaining_quantity' => 120,
                'is_available' => true,
                'sort_order' => 1,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Bière Tembo',
                'emoji' => '🐘',
                'category' => 'drink',
                'description' => 'La bière brune nationale de caractère, surnommée "l\'Eléphant".',
                'available_quantity' => 80,
                'remaining_quantity' => 80,
                'is_available' => true,
                'sort_order' => 2,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Bière Nkoyi',
                'emoji' => '🐆',
                'category' => 'drink',
                'description' => 'La bière blonde premium locale au design léopard, douce et rafraîchissante.',
                'available_quantity' => 100,
                'remaining_quantity' => 100,
                'is_available' => true,
                'sort_order' => 3,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Tangawisi Artisanal',
                'emoji' => '🍹',
                'category' => 'drink',
                'description' => 'Jus de gingembre local fait maison, corsé avec une infusion d\'ananas et de citron.',
                'available_quantity' => 200,
                'remaining_quantity' => 200,
                'is_available' => true,
                'sort_order' => 4,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Jus de Bissap / Foléré',
                'emoji' => '🌺',
                'category' => 'drink',
                'description' => 'Boisson rafraîchissante d\'hibiscus rouge infusé à la menthe fraîche et à la vanille.',
                'available_quantity' => 150,
                'remaining_quantity' => 150,
                'is_available' => true,
                'sort_order' => 5,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Vitalo Ananas',
                'emoji' => '🍍',
                'category' => 'drink',
                'description' => 'Limonade locale gazeuse iconique et très fruitée.',
                'available_quantity' => 100,
                'remaining_quantity' => 100,
                'is_available' => true,
                'sort_order' => 6,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Samba Frais (Vin de Palme)',
                'emoji' => '🌴',
                'category' => 'drink',
                'description' => 'Vin de palme traditionnel, doux et pétillant, récolté le matin même de manière artisanale.',
                'available_quantity' => 50,
                'remaining_quantity' => 50,
                'is_available' => true,
                'sort_order' => 7,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Lotoko Premium',
                'emoji' => '🥃',
                'category' => 'drink',
                'description' => 'Alcool traditionnel de maïs distillé avec soin et aromatisé au gingembre.',
                'available_quantity' => 30,
                'remaining_quantity' => 30,
                'is_available' => true,
                'sort_order' => 8,
            ],

            // Food (Plats traditionnels)
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Poulet à la Moambe',
                'emoji' => '🍗',
                'category' => 'food',
                'description' => 'Le plat national par excellence : poulet tendre mijoté dans une sauce onctueuse de noix de palme.',
                'available_quantity' => 150,
                'remaining_quantity' => 150,
                'is_available' => true,
                'sort_order' => 9,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Liboke de Capitaine',
                'emoji' => '🐟',
                'category' => 'food',
                'description' => 'Pavé de poisson Capitaine épicé aux tomates et oignons, cuit à l\'étouffée dans des feuilles de bananier.',
                'available_quantity' => 100,
                'remaining_quantity' => 100,
                'is_available' => true,
                'sort_order' => 10,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Kamundele (Brochettes)',
                'emoji' => '🍢',
                'category' => 'food',
                'description' => 'Brochettes de bœuf tendres et épicées, marinées à la congolaise puis grillées au barbecue.',
                'available_quantity' => 300,
                'remaining_quantity' => 300,
                'is_available' => true,
                'sort_order' => 11,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Pondu (Saka-Saka)',
                'emoji' => '🥗',
                'category' => 'food',
                'description' => 'Feuilles de manioc finement pilées, cuites à l\'huile de palme avec aubergines, poireaux et ail.',
                'available_quantity' => 200,
                'remaining_quantity' => 200,
                'is_available' => true,
                'sort_order' => 12,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'name' => 'Mikate chauds',
                'emoji' => '🥯',
                'category' => 'food',
                'description' => 'Beignets congolais traditionnels, croustillants à l\'extérieur et moelleux à l\'intérieur.',
                'available_quantity' => 400,
                'remaining_quantity' => 400,
                'is_available' => true,
                'sort_order' => 13,
            ],
        ];

        foreach ($menuItems as $item) {
            MenuItemModel::create($item);
        }

        // 5. Create Guests (Inspired by authentic Congolese names)
        $guestsData = [
            // Table Kinshasa Guests
            [
                'id' => '4bd02128-52b9-4609-9f9e-8e9bc3ab6914', // Exact invitation link/invite ID from request 3
                'wedding_id' => $weddingId,
                'first_name' => 'Dieudonné',
                'last_name' => 'Kabange',
                'email' => 'dieudonne.kabange@gmail.com',
                'phone' => '+243 812 345 678',
                'status' => 'confirmed',
                'role' => 'guest',
                'companions' => 1,
                'dietary_restrictions' => 'Pas de porc',
                'drink_preference' => 'Bière Primus',
                'qr_code' => 'QR_DIEUDONNE_KABANGE',
                'invitation_link' => '4bd02128-52b9-4609-9f9e-8e9bc3ab6914',
                'rsvp_message' => 'Hâte de célébrer ce grand jour avec vous ! Vive la Rumba !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Glody',
                'last_name' => 'Mutombo',
                'email' => 'glody.m@gmail.com',
                'phone' => '+243 897 123 456',
                'status' => 'confirmed',
                'role' => 'best_man',
                'companions' => 0,
                'dietary_restrictions' => null,
                'drink_preference' => 'Bière Tembo',
                'qr_code' => 'QR_GLODY_MUTOMBO',
                'invitation_link' => null,
                'rsvp_message' => 'Présent à 100% mon frère !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Merveille',
                'last_name' => 'Tshibanda',
                'email' => 'merveille.t@gmail.com',
                'phone' => '+243 824 556 778',
                'status' => 'confirmed',
                'role' => 'bride',
                'companions' => 0,
                'dietary_restrictions' => null,
                'drink_preference' => 'Tangawisi Artisanal',
                'qr_code' => 'QR_MERVEILLE_TSHIBANDA',
                'invitation_link' => null,
                'rsvp_message' => null,
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Dorcas',
                'last_name' => 'Kabasele',
                'email' => 'dorcas.kab@gmail.com',
                'phone' => '+243 815 999 888',
                'status' => 'confirmed',
                'role' => 'maid_of_honor',
                'companions' => 0,
                'dietary_restrictions' => 'Végétarienne',
                'drink_preference' => 'Jus de Bissap / Foléré',
                'qr_code' => 'QR_DORCAS_KABASELE',
                'invitation_link' => null,
                'rsvp_message' => 'Tellement impatiente de t\'accompagner Merveille !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
            ],

            // Table Lubumbashi Guests
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Trésor',
                'last_name' => 'Ilunga',
                'email' => 'tresor.ilunga@yahoo.fr',
                'phone' => '+243 892 223 344',
                'status' => 'confirmed',
                'role' => 'guest',
                'companions' => 2,
                'dietary_restrictions' => null,
                'drink_preference' => 'Samba Frais (Vin de Palme)',
                'qr_code' => 'QR_TRESOR_ILUNGA',
                'invitation_link' => null,
                'rsvp_message' => 'Nous venons en famille depuis Lubumbashi !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687120',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Espoir',
                'last_name' => 'Mwamba',
                'email' => 'espoir.m@gmail.com',
                'phone' => '+243 813 111 222',
                'status' => 'invited',
                'role' => 'guest',
                'companions' => 1,
                'dietary_restrictions' => null,
                'drink_preference' => 'Bière Nkoyi',
                'qr_code' => 'QR_ESPOIR_MWAMBA',
                'invitation_link' => null,
                'rsvp_message' => null,
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687120',
            ],

            // Table Goma Guests
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Ketsia',
                'last_name' => 'Kalonji',
                'email' => 'ketsia.kal@hotmail.com',
                'phone' => '+243 821 445 566',
                'status' => 'confirmed',
                'role' => 'guest',
                'companions' => 0,
                'dietary_restrictions' => null,
                'drink_preference' => 'Vitalo Ananas',
                'qr_code' => 'QR_KETSIA_KALONJI',
                'invitation_link' => null,
                'rsvp_message' => 'Présente avec joie !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687121',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Fiston',
                'last_name' => 'Luvualu',
                'email' => 'fiston.lu@gmail.com',
                'phone' => '+243 854 778 899',
                'status' => 'confirmed',
                'role' => 'guest',
                'companions' => 1,
                'dietary_restrictions' => null,
                'drink_preference' => 'Lotoko Premium',
                'qr_code' => 'QR_FISTON_LUVUALU',
                'invitation_link' => null,
                'rsvp_message' => 'On va fêter ça dignement !',
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687121',
            ],

            // Invited (No response yet)
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Grâce',
                'last_name' => 'Lokolo',
                'email' => 'grace.lok@gmail.com',
                'phone' => '+243 819 001 002',
                'status' => 'invited',
                'role' => 'guest',
                'companions' => 0,
                'dietary_restrictions' => null,
                'drink_preference' => null,
                'qr_code' => 'QR_GRACE_LOKOLO',
                'invitation_link' => null,
                'rsvp_message' => null,
                'table_id' => null,
            ],

            // Declined (Refusé)
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'first_name' => 'Christian',
                'last_name' => 'Ngoyi',
                'email' => 'christian.ng@gmail.com',
                'phone' => '+243 898 223 311',
                'status' => 'declined',
                'role' => 'guest',
                'companions' => 0,
                'dietary_restrictions' => null,
                'drink_preference' => null,
                'qr_code' => 'QR_CHRISTIAN_NGOYI',
                'invitation_link' => null,
                'rsvp_message' => 'Malheureusement hors du pays à cette date. Toutes mes félicitations !',
                'table_id' => null,
            ],
        ];

        foreach ($guestsData as $g) {
            GuestModel::create($g);
        }

        // 6. Create Timeline Events (Chronogramme de la journée)
        $timelineEvents = [
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Le Dot (Mariage Coutumier)',
                'description' => 'Cérémonie de remise officielle des présents et de la dot par la famille d\'Elikia à la famille de Merveille.',
                'time' => '13:00',
                'category' => 'ceremony',
                'status' => 'completed',
                'notify_all' => false,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Cérémonie Religieuse & Vœux',
                'description' => 'Bénédiction nuptiale solennelle des mariés au grand temple du Palais du Fleuve.',
                'time' => '15:30',
                'category' => 'ceremony',
                'status' => 'completed',
                'notify_all' => false,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Cocktail de Bienvenue & Rumba acoustique',
                'description' => 'Dégustation de Tangawisi Artisanal et Jus de Bissap frais. Animation en direct par un trio de Rumba Congolaise acoustique.',
                'time' => '17:30',
                'category' => 'cocktail',
                'status' => 'current',
                'notify_all' => true,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Entrée Royale des Mariés',
                'description' => 'Arrivée triomphale d\'Elikia & Merveille sous une haie d\'honneur au rythme du Ndombolo.',
                'time' => '19:00',
                'category' => 'reception',
                'status' => 'upcoming',
                'notify_all' => true,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Ouverture du Buffet Moambe',
                'description' => 'Grand buffet gastronomique congolais : Poulet à la Moambe, Liboke de Capitaine, Kamundele grillés, Pondu et Mikate chauds.',
                'time' => '19:30',
                'category' => 'dinner',
                'status' => 'upcoming',
                'notify_all' => true,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Gâteau & Ouverture du Bal de Rumba',
                'description' => 'Découpe de la pièce montée suivie de la première valse des mariés et ouverture de la piste.',
                'time' => '21:30',
                'category' => 'party',
                'status' => 'upcoming',
                'notify_all' => false,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Ndombolo & Ambiance Chaude',
                'description' => 'Soirée dansante animée par le DJ jusqu\'au bout de la nuit avec les meilleurs hits congolais.',
                'time' => '23:00',
                'category' => 'party',
                'status' => 'upcoming',
                'notify_all' => false,
            ],
        ];

        foreach ($timelineEvents as $event) {
            TimelineEventModel::create($event);
        }

        // 7. Create Sample Orders
        $orders = [
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
                'table_name' => 'Table Kinshasa (VIP)',
                'guest_id' => '4bd02128-52b9-4609-9f9e-8e9bc3ab6914',
                'guest_name' => 'Dieudonné Kabange',
                'type' => 'drink',
                'description' => '2x Tangawisi Artisanal corsé, 1x Bière Primus bien fraîche',
                'status' => 'completed',
                'priority' => 'normal',
                'assigned_server' => 'Jean',
                'notes' => 'Pas trop de glaçons pour les jus.',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687119',
                'table_name' => 'Table Kinshasa (VIP)',
                'guest_id' => null,
                'guest_name' => 'Dorcas Kabasele',
                'type' => 'food',
                'description' => '1x Pondu (Saka-Saka) avec Mikate chauds',
                'status' => 'pending',
                'priority' => 'high',
                'assigned_server' => 'Jean',
                'notes' => 'Pour la demoiselle d\'honneur.',
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'table_id' => 'caa86ae6-a175-4644-8c8d-a8d457687120',
                'table_name' => 'Table Lubumbashi',
                'guest_id' => null,
                'guest_name' => 'Trésor Ilunga',
                'type' => 'drink',
                'description' => '2x Samba Frais (Vin de Palme), 1x Bière Tembo',
                'status' => 'pending',
                'priority' => 'normal',
                'assigned_server' => 'Sarah',
                'notes' => 'Tembo à température ambiante s\'il vous plaît.',
            ],
        ];

        foreach ($orders as $o) {
            OrderModel::create($o);
        }

        // 8. Create Photos
        $photos = [
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'url' => 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
                'caption' => 'Préparation de la mariée Merveille',
                'uploaded_by' => 'Dorcas Kabasele',
                'category' => 'bride',
                'is_featured' => true,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'url' => 'https://images.unsplash.com/photo-1519225495810-7512c696505a?auto=format&fit=crop&q=80&w=800',
                'caption' => 'La cérémonie de bénédiction religieuse',
                'uploaded_by' => 'Glody Mutombo',
                'category' => 'ceremony',
                'is_featured' => false,
            ],
        ];

        foreach ($photos as $p) {
            PhotoModel::create($p);
        }

        // 9. Create Notifications
        $notifications = [
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Le cocktail de bienvenue est servi !',
                'message' => 'Rejoignez-nous dans le jardin du fleuve pour déguster nos boissons artisanales (Tangawisi, Bissap, Vin de palme) et profiter de la Rumba.',
                'type' => 'info',
                'target_role' => 'all',
                'is_read' => false,
            ],
            [
                'id' => (string) Str::uuid(),
                'wedding_id' => $weddingId,
                'title' => 'Entrée imminente des mariés !',
                'message' => 'Prenez place à vos tables, Elikia & Merveille font leur entrée dans quelques instants.',
                'type' => 'alert',
                'target_role' => 'all',
                'is_read' => false,
            ],
        ];

        foreach ($notifications as $n) {
            WeddingNotificationModel::create($n);
        }
    }
}
