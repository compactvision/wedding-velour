<?php

namespace App\Application\Migration;

use App\Models\EventCategory;
use App\Models\EventModuleDefinition;
use App\Models\EventType;
use App\Models\InvitationTemplate;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Str;

class FoundationCatalogService
{
    private const PERMISSIONS = [
        'organization.view' => 'Consulter l’organisation',
        'organization.update' => 'Modifier l’organisation',
        'event.view' => 'Consulter un événement',
        'event.update' => 'Modifier un événement',
        'guests.view' => 'Consulter les invités',
        'guests.update' => 'Modifier les invités',
        'invitations.view' => 'Consulter les invitations',
        'invitations.update' => 'Personnaliser les invitations',
        'rsvps.view' => 'Consulter les réponses RSVP',
        'seating.view' => 'Consulter le plan de salle',
        'seating.update' => 'Gérer les tables et les placements',
        'schedule.view' => 'Consulter le programme',
        'schedule.update' => 'Gérer le programme et son avancement',
        'notifications.view' => 'Consulter les communications',
        'notifications.update' => 'Créer et publier les communications',
        'catering.view' => 'Consulter la restauration',
        'catering.manage' => 'Gérer la restauration',
        'checkins.view' => 'Consulter les entrées',
        'checkins.scan' => 'Scanner les accès',
        'checkins.manage' => 'Annuler un pointage',
        'team.view' => 'Consulter les collaborateurs',
        'team.manage' => 'Inviter et gérer les collaborateurs',
        'billing.view' => 'Consulter les plans et devis',
        'billing.manage' => 'Créer et gérer les devis',
        'payments.view' => 'Consulter les paiements et abonnements',
        'payments.create' => 'Initier un paiement',
        'budget.view' => 'Consulter le budget et les dépenses',
        'budget.manage' => 'Gérer le budget et les dépenses',
        'expenses.approve' => 'Approuver et marquer les dépenses payées',
        'stock.view' => 'Consulter le stock et ses mouvements',
        'stock.manage' => 'Gérer les articles et les mouvements de stock',
        'purchasing.manage' => 'Gérer les fournisseurs et les achats',
        'purchasing.approve' => 'Approuver et réceptionner les achats',
        'vendors.view' => 'Consulter les prestataires et contrats',
        'vendors.manage' => 'Gérer les prestataires',
        'contracts.manage' => 'Créer et gérer les contrats',
        'contracts.approve' => 'Approuver, signer et clôturer les contrats',
        'documents.view' => 'Consulter les documents',
        'documents.manage' => 'Ajouter, versionner et supprimer les documents',
        'documents.download' => 'Télécharger les documents privés',
        'media.view' => 'Consulter les médias',
        'media.manage' => 'Ajouter et organiser les médias',
        'media.publish' => 'Publier les médias',
        'ticketing.view' => 'Consulter la billetterie',
        'ticketing.manage' => 'Gérer les catégories et quotas',
        'ticketing.sales' => 'Créer et confirmer les commandes',
        'ticketing.scan' => 'Contrôler les billets QR',
        'badges.view' => 'Consulter les badges',
        'badges.manage' => 'Gérer les modèles de badges',
        'badges.issue' => 'Émettre et révoquer les badges',
    ];

    private const CATEGORIES = [
        'familial' => ['name' => 'Familial', 'description' => 'Célébrations et rassemblements familiaux.'],
        'personnel' => ['name' => 'Personnel', 'description' => 'Moments privés et événements sur invitation.'],
        'professionnel' => ['name' => 'Professionnel', 'description' => 'Rencontres d’entreprise et événements métiers.'],
        'public' => ['name' => 'Public', 'description' => 'Événements ouverts, culturels et communautaires.'],
        'commemoratif' => ['name' => 'Commémoratif', 'description' => 'Cérémonies de mémoire et de recueillement.'],
    ];

    private const MODULES = [
        'guests' => ['name' => 'Invités', 'description' => 'Listes, groupes et informations des participants.'],
        'invitations' => ['name' => 'Invitations', 'description' => 'Invitations numériques et liens personnalisés.', 'dependencies' => ['guests']],
        'rsvps' => ['name' => 'RSVP', 'description' => 'Réponses, accompagnants et préférences.', 'dependencies' => ['guests', 'invitations']],
        'seating' => ['name' => 'Tables et placement', 'description' => 'Plans de salle, tables et affectations.', 'dependencies' => ['guests']],
        'catering' => ['name' => 'Repas et menus', 'description' => 'Menus, préférences et service de restauration.'],
        'schedule' => ['name' => 'Programme', 'description' => 'Déroulé, activités et temps forts.'],
        'tasks' => ['name' => 'Tâches', 'description' => 'Suivi des actions et responsabilités.'],
        'budget' => ['name' => 'Budget', 'description' => 'Prévisions et suivi financier.'],
        'stock' => ['name' => 'Stock', 'description' => 'Articles, niveaux et mouvements de stock.'],
        'purchasing' => ['name' => 'Achats', 'description' => 'Fournisseurs et commandes d’achat.', 'dependencies' => ['stock']],
        'staff' => ['name' => 'Personnel', 'description' => 'Équipes opérationnelles et affectations.'],
        'vendors' => ['name' => 'Prestataires', 'description' => 'Fournisseurs, contacts et prestations.'],
        'contracts' => ['name' => 'Contrats', 'description' => 'Engagements et échéances contractuelles.', 'dependencies' => ['vendors']],
        'documents' => ['name' => 'Documents', 'description' => 'Centralisation des documents de l’événement.'],
        'media' => ['name' => 'Médias', 'description' => 'Photos et contenus partagés.'],
        'gallery' => ['name' => 'Galerie', 'description' => 'Galerie publique ou privée.', 'dependencies' => ['media']],
        'ticketing' => ['name' => 'Billetterie', 'description' => 'Billets, quotas et catégories d’accès.'],
        'qr_access' => ['name' => 'QR et contrôle d’accès', 'description' => 'Badges QR, scan et contrôle des entrées.'],
        'badges' => ['name' => 'Badges', 'description' => 'Badges nominatifs et catégories.', 'dependencies' => ['guests']],
        'gifts' => ['name' => 'Cadeaux', 'description' => 'Listes et suivi des cadeaux.', 'dependencies' => ['guests']],
        'notifications' => ['name' => 'Notifications', 'description' => 'Alertes et communications automatisées.'],
        'forms' => ['name' => 'Formulaires', 'description' => 'Collecte structurée d’informations.'],
        'analytics' => ['name' => 'Statistiques', 'description' => 'Indicateurs et synthèses de pilotage.'],
    ];

    private const EVENT_TYPES = [
        'wedding' => [
            'category' => 'familial',
            'name' => 'Mariage',
            'description' => 'Cérémonie, réception et coordination des invités.',
            'icon' => 'rings',
            'color' => '#B98235',
            'defaults' => ['guests', 'invitations', 'rsvps', 'seating', 'schedule', 'notifications', 'qr_access', 'budget'],
            'recommended' => ['catering', 'vendors', 'contracts', 'gallery', 'stock', 'purchasing'],
        ],
        'birthday' => [
            'category' => 'familial',
            'name' => 'Anniversaire',
            'description' => 'Une célébration privée, simple ou grand format.',
            'icon' => 'cake',
            'color' => '#D66F7A',
            'defaults' => ['guests', 'invitations', 'rsvps', 'schedule', 'notifications'],
            'recommended' => ['catering', 'gallery', 'gifts'],
        ],
        'private-party' => [
            'category' => 'personnel',
            'name' => 'Soirée privée',
            'description' => 'Dîner, réception ou fête sur invitation.',
            'icon' => 'party-popper',
            'color' => '#7C5C9E',
            'defaults' => ['guests', 'invitations', 'rsvps', 'notifications'],
            'recommended' => ['catering', 'schedule', 'gallery', 'qr_access'],
        ],
        'conference' => [
            'category' => 'professionnel',
            'name' => 'Conférence',
            'description' => 'Sessions, participants, badges et contrôle d’accès.',
            'icon' => 'presentation',
            'color' => '#2E7392',
            'defaults' => ['guests', 'schedule', 'notifications', 'qr_access'],
            'recommended' => ['ticketing', 'badges', 'staff', 'forms', 'analytics'],
        ],
        'corporate-event' => [
            'category' => 'professionnel',
            'name' => 'Événement d’entreprise',
            'description' => 'Séminaire, lancement ou rencontre interne.',
            'icon' => 'briefcase',
            'color' => '#4D6B57',
            'defaults' => ['guests', 'schedule', 'tasks', 'notifications'],
            'recommended' => ['budget', 'staff', 'vendors', 'documents', 'forms'],
        ],
        'concert' => [
            'category' => 'public',
            'name' => 'Concert ou spectacle',
            'description' => 'Billetterie, accès, équipes et programmation.',
            'icon' => 'music',
            'color' => '#C14E39',
            'defaults' => ['ticketing', 'qr_access', 'schedule', 'staff', 'notifications'],
            'recommended' => ['badges', 'media', 'analytics'],
        ],
        'memorial' => [
            'category' => 'commemoratif',
            'name' => 'Cérémonie commémorative',
            'description' => 'Accueil, programme et informations aux proches.',
            'icon' => 'flower',
            'color' => '#667085',
            'defaults' => ['guests', 'invitations', 'schedule', 'notifications'],
            'recommended' => ['catering', 'media'],
        ],
    ];

    public function seed(): EventType
    {
        foreach (self::PERMISSIONS as $key => $description) {
            Permission::query()->firstOrCreate(
                ['key' => $key],
                [
                    'module_slug' => Str::before($key, '.'),
                    'description' => $description,
                ],
            );
        }

        $categories = [];
        foreach (self::CATEGORIES as $slug => $definition) {
            $category = EventCategory::query()->firstOrNew(['slug' => $slug]);
            $category->fill([
                'id' => $category->id ?: (string) Str::uuid(),
                ...$definition,
                'status' => 'active',
                'sort_order' => array_search($slug, array_keys(self::CATEGORIES), true),
            ])->save();
            $categories[$slug] = $category;
        }

        $modules = [];
        foreach (self::MODULES as $slug => $definition) {
            $module = EventModuleDefinition::query()->firstOrNew(['slug' => $slug]);
            $module->fill([
                'id' => $module->id ?: (string) Str::uuid(),
                'name' => $definition['name'],
                'description' => $definition['description'],
                'dependencies' => $definition['dependencies'] ?? [],
                'status' => 'active',
                'category' => 'core',
                'sort_order' => array_search($slug, array_keys(self::MODULES), true),
            ])->save();
            $modules[$slug] = $module;
        }

        $eventTypes = [];
        foreach (self::EVENT_TYPES as $slug => $definition) {
            $eventType = EventType::query()->firstOrNew(['slug' => $slug]);
            $eventType->fill([
                'id' => $eventType->id ?: (string) Str::uuid(),
                'event_category_id' => $categories[$definition['category']]->id,
                'name' => $definition['name'],
                'description' => $definition['description'],
                'icon' => $definition['icon'],
                'status' => 'active',
                'primary_color' => $definition['color'],
                'sort_order' => array_search($slug, array_keys(self::EVENT_TYPES), true),
            ])->save();

            foreach ($modules as $moduleSlug => $module) {
                $isDefault = in_array($moduleSlug, $definition['defaults'], true);
                $isRecommended = in_array($moduleSlug, $definition['recommended'], true);
                $eventType->modules()->syncWithoutDetaching([
                    $module->id => [
                        'recommendation_level' => $isDefault
                            ? 'required'
                            : ($isRecommended ? 'recommended' : 'optional'),
                        'default_enabled' => $isDefault,
                        'sort_order' => $module->sort_order,
                    ],
                ]);
            }

            $eventTypes[$slug] = $eventType;
        }

        $this->seedInvitationTemplates($eventTypes);

        return $eventTypes['wedding'];
    }

    /**
     * @param  array<string, EventType>  $eventTypes
     */
    private function seedInvitationTemplates(array $eventTypes): void
    {
        if (! \Schema::hasTable('invitation_templates')) {
            return;
        }

        $templates = [
            'wedding' => [
                ['elegant', 'Élégance romantique', 'Une invitation chaleureuse et raffinée.', true, 'Ensemble pour la vie', 'C’est avec une immense joie que nous vous invitons à célébrer notre union. Votre présence rendra cette journée encore plus précieuse.', '#B98235'],
                ['tradition', 'Union traditionnelle', 'Un texte solennel pour réunir les familles.', false, 'Deux familles, une même histoire', 'Nos familles ont l’honneur de vous convier à la célébration de notre union, dans la tradition, la joie et la communion.', '#8A4B2A'],
                ['minimal', 'Oui, simplement', 'Un contenu moderne, intime et direct.', false, 'Nous nous marions', 'Nous avons choisi de nous dire oui et aimerions vivre ce moment simple, beau et inoubliable avec vous.', '#6F7C68'],
            ],
            'birthday' => [['celebration', 'Joyeux anniversaire', 'Une invitation festive et conviviale.', true, 'Une nouvelle bougie à célébrer', 'Une belle fête se prépare. Venez partager les sourires, la musique et les souvenirs de cet anniversaire.', '#D66F7A']],
            'private-party' => [['soiree', 'Soirée privée', 'Un ton complice pour une réception privée.', true, 'Vous êtes sur la liste', 'Nous préparons une soirée privée et serions ravis de vous compter parmi nous.', '#7C5C9E']],
            'conference' => [['professional', 'Invitation professionnelle', 'Un message clair pour participants et partenaires.', true, 'Invitation professionnelle', 'Nous avons le plaisir de vous inviter à cet événement consacré aux échanges, aux idées et aux nouvelles opportunités.', '#2E7392']],
            'corporate-event' => [['corporate', 'Événement d’entreprise', 'Une invitation institutionnelle et accueillante.', true, 'Rencontrons-nous', 'Nous serions heureux de vous accueillir à cet événement professionnel pour partager notre vision et créer de nouvelles perspectives.', '#4D6B57']],
            'concert' => [['live', 'Rendez-vous live', 'Une invitation énergique pour un concert ou spectacle.', true, 'Vivez la scène avec nous', 'La scène s’allume bientôt. Rejoignez-nous pour une expérience live portée par la musique et l’énergie.', '#C14E39']],
            'memorial' => [['memory', 'En mémoire', 'Un message sobre, digne et respectueux.', true, 'En souvenir d’une vie précieuse', 'Nous vous invitons à vous joindre à nous pour honorer sa mémoire et nous recueillir ensemble.', '#667085']],
        ];

        foreach ($templates as $eventTypeSlug => $items) {
            foreach ($items as $sortOrder => [$slug, $name, $description, $isDefault, $eyebrow, $body, $color]) {
                InvitationTemplate::query()->firstOrCreate(
                    ['event_type_id' => $eventTypes[$eventTypeSlug]->id, 'slug' => $slug],
                    [
                        'name' => $name,
                        'description' => $description,
                        'configuration' => [
                            'eyebrow' => $eyebrow,
                            'greeting' => 'Cher(e) {guest}',
                            'body' => $body,
                            'rsvp_question' => $eventTypeSlug === 'wedding'
                                ? 'Serez-vous à nos côtés pour célébrer notre mariage ?'
                                : 'Serez-vous présent(e) ?',
                            'accept_label' => 'Oui, je serai là',
                            'decline_label' => 'Je ne pourrai pas venir',
                            'footer' => 'Au plaisir de vous retrouver',
                            'accent_color' => $color,
                        ],
                        'is_default' => $isDefault,
                        'status' => 'active',
                        'sort_order' => $sortOrder,
                    ],
                );
            }
        }
    }

    /**
     * @return array<string, Role>
     */
    public function seedOrganizationRoles(Organization $organization): array
    {
        $definitions = [
            'organization_admin' => [
                'name' => 'Administrateur',
                'scope' => 'organization',
                'permissions' => [
                    'organization.view',
                    'organization.update',
                    'event.view',
                    'event.update',
                    'guests.view',
                    'guests.update',
                    'invitations.view',
                    'invitations.update',
                    'rsvps.view',
                    'seating.view',
                    'seating.update',
                    'schedule.view',
                    'schedule.update',
                    'notifications.view',
                    'notifications.update',
                    'catering.view',
                    'catering.manage',
                    'checkins.view',
                    'checkins.scan',
                    'checkins.manage',
                    'team.view',
                    'team.manage',
                    'billing.view',
                    'billing.manage',
                    'payments.view',
                    'payments.create',
                    'budget.view',
                    'budget.manage',
                    'expenses.approve',
                    'stock.view',
                    'stock.manage',
                    'purchasing.manage',
                    'purchasing.approve',
                    'vendors.view',
                    'vendors.manage',
                    'contracts.manage',
                    'contracts.approve',
                    'documents.view',
                    'documents.manage',
                    'documents.download',
                    'media.view',
                    'media.manage',
                    'media.publish',
                    'ticketing.view',
                    'ticketing.manage',
                    'ticketing.sales',
                    'ticketing.scan',
                    'badges.view',
                    'badges.manage',
                    'badges.issue',
                ],
            ],
            'event_organizer' => [
                'name' => 'Organisateur',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'event.update',
                    'guests.view',
                    'guests.update',
                    'invitations.view',
                    'invitations.update',
                    'rsvps.view',
                    'seating.view',
                    'seating.update',
                    'schedule.view',
                    'schedule.update',
                    'notifications.view',
                    'notifications.update',
                    'catering.view',
                    'catering.manage',
                    'checkins.view',
                    'checkins.scan',
                    'checkins.manage',
                    'team.view',
                    'team.manage',
                    'billing.view',
                    'payments.view',
                    'budget.view',
                    'budget.manage',
                    'expenses.approve',
                    'stock.view',
                    'stock.manage',
                    'purchasing.manage',
                    'purchasing.approve',
                    'vendors.view',
                    'vendors.manage',
                    'contracts.manage',
                    'contracts.approve',
                    'documents.view',
                    'documents.manage',
                    'documents.download',
                    'media.view',
                    'media.manage',
                    'media.publish',
                    'ticketing.view',
                    'ticketing.manage',
                    'ticketing.sales',
                    'ticketing.scan',
                    'badges.view',
                    'badges.manage',
                    'badges.issue',
                ],
            ],
            'catering_operator' => [
                'name' => 'Opérateur restauration',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'catering.view',
                    'catering.manage',
                ],
            ],
            'access_controller' => [
                'name' => 'Contrôleur d’accès',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'guests.view',
                    'guests.update',
                    'rsvps.view',
                    'seating.view',
                    'schedule.view',
                    'notifications.view',
                    'checkins.view',
                    'checkins.scan',
                    'badges.view',
                ],
            ],
            'financial_manager' => [
                'name' => 'Responsable financier',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'budget.view',
                    'budget.manage',
                    'expenses.approve',
                    'billing.view',
                    'payments.view',
                    'stock.view',
                    'purchasing.manage',
                    'purchasing.approve',
                ],
            ],
            'logistics_manager' => [
                'name' => 'Responsable logistique',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'stock.view',
                    'stock.manage',
                    'purchasing.manage',
                    'purchasing.approve',
                    'budget.view',
                    'documents.view',
                    'documents.download',
                ],
            ],
            'vendor_manager' => [
                'name' => 'Responsable prestataires',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'vendors.view',
                    'vendors.manage',
                    'contracts.manage',
                    'contracts.approve',
                    'budget.view',
                    'documents.view',
                    'documents.manage',
                    'documents.download',
                ],
            ],
            'document_manager' => [
                'name' => 'Responsable documents',
                'scope' => 'event',
                'permissions' => [
                    'organization.view',
                    'event.view',
                    'documents.view',
                    'documents.manage',
                    'documents.download',
                ],
            ],
            'media_manager' => [
                'name' => 'Responsable médias',
                'scope' => 'event',
                'permissions' => ['organization.view', 'event.view', 'media.view', 'media.manage', 'media.publish'],
            ],
            'ticket_manager' => [
                'name' => 'Responsable billetterie',
                'scope' => 'event',
                'permissions' => ['organization.view', 'event.view', 'ticketing.view', 'ticketing.manage', 'ticketing.sales', 'ticketing.scan', 'badges.view', 'badges.issue'],
            ],
            'badge_manager' => [
                'name' => 'Responsable badges',
                'scope' => 'event',
                'permissions' => ['organization.view', 'event.view', 'guests.view', 'ticketing.view', 'badges.view', 'badges.manage', 'badges.issue'],
            ],
        ];

        $roles = [];
        foreach ($definitions as $slug => $definition) {
            $role = Role::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'slug' => $slug,
                    'scope' => $definition['scope'],
                ],
                [
                    'id' => (string) Str::uuid(),
                    'name' => $definition['name'],
                    'is_system' => true,
                ],
            );

            $permissionIds = Permission::query()
                ->whereIn('key', $definition['permissions'])
                ->pluck('id');
            $role->permissions()->syncWithoutDetaching($permissionIds);
            $roles[$slug] = $role;
        }

        return $roles;
    }
}
