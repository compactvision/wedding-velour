# Planivo — Plan de migration vers le SaaS multi-tenant

Date : 28 juillet 2026  
Prérequis : audit et conception validés  
Statut : Phase 3 — plan exécutable, aucune table historique supprimée

## 1. Objectif

Ce plan transforme progressivement le modèle centré sur `weddings` en modèle SaaS fondé sur :

- `organizations` ;
- `organization_members` ;
- `events` ;
- `event_members` ;
- types et catégories d’événements ;
- modules activables ;
- invitations, RSVP et paramètres normalisés ;
- facturation et paiements.

Le plan protège les données existantes et permet un retour applicatif à chaque étape. La migration suit le modèle :

```text
Inventaire
  → Expand
  → Backfill
  → Dual-read
  → Dual-write
  → Cutover
  → Observation
  → Contract
```

Le lot `Contract`, qui supprime les anciennes structures, est volontairement séparé et reporté après une période de stabilité.

## 2. Invariants

1. Aucune migration initiale ne supprime ou ne renomme une table existante.
2. Toutes les nouvelles colonnes ajoutées aux tables historiques sont d’abord `nullable`.
3. Les contraintes `NOT NULL` ne sont posées qu’après un backfill vérifié.
4. Toute conversion conserve un identifiant ou une table de correspondance.
5. Le backfill est idempotent, relançable et exécutable en mode simulation.
6. Les lectures historiques restent disponibles pendant le dual-read.
7. Les écritures critiques sont comparées pendant le dual-write.
8. Les liens d’invitation existants continuent de fonctionner.
9. Les pièces comptables et journaux ne sont jamais supprimés par rollback métier.
10. Aucun compte sans mapping explicite ne reçoit un accès large par défaut.

## 3. État source

Snapshot local observé lors de l’audit :

| Table source | Lignes |
|---|---:|
| weddings | 1 |
| users | 5 |
| guests | 14 |
| wedding_tables | 6 |
| menu_items | 13 |
| orders | 6 |
| photos | 3 |
| timeline_events | 7 |
| wedding_notifications | 2 |

Ce snapshot sert de référence locale, pas de vérité pour les autres environnements. Chaque déploiement génère son propre inventaire avant migration.

## 4. Préparation obligatoire

### 4.1 Sauvegardes

Avant chaque lot :

- sauvegarde logique de la base ;
- snapshot du volume ;
- copie des médias ;
- export des variables de configuration sans secrets en clair ;
- empreinte SHA-256 des sauvegardes ;
- test de restauration sur un environnement isolé.

Une sauvegarde non restaurée au moins une fois n’est pas considérée comme valide.

### 4.2 Gel et inventaire

La commande d’inventaire doit produire :

```text
storage/app/migration-reports/{run_id}/inventory.json
storage/app/migration-reports/{run_id}/counts.csv
storage/app/migration-reports/{run_id}/constraints.json
storage/app/migration-reports/{run_id}/orphans.csv
storage/app/migration-reports/{run_id}/duplicate-tokens.csv
storage/app/migration-reports/{run_id}/checksum.json
```

Contrôles :

- utilisateurs sans rôle ;
- utilisateurs avec `wedding_id` inexistant ;
- enfants avec `wedding_id` inexistant ;
- `table_id` ou `guest_id` orphelins ;
- liens d’invitation nuls ou dupliqués ;
- UUID invalides ;
- statuts inconnus ;
- dates invalides ;
- chemins média inexistants ;
- `offline_uuid` dupliqués ;
- quantités négatives ;
- tables surchargées.

### 4.3 Configuration de mapping

Un fichier versionné hors secrets décrit le rattachement historique :

```yaml
default_organization:
  name: "Organisation Planivo historique"
  slug: "planivo-historique"
  owner_user_id: "<uuid-utilisateur>"

weddings:
  "<wedding-uuid>":
    organization_slug: "planivo-historique"
    event_slug: "nom-evenement"
    timezone: "Africa/Kinshasa"
    country_code: "CD"
```

Si plusieurs anciens clients partagent la base, chaque mariage doit être mappé explicitement. Aucun algorithme ne doit deviner le propriétaire depuis un titre ou une adresse.

### 4.4 Feature flags

Flags de migration :

```text
tenant_foundation_enabled
tenant_enforcement_enabled
event_reads_v2_enabled
event_writes_v2_enabled
invitation_reads_v2_enabled
invitation_writes_v2_enabled
offline_namespace_v2_enabled
billing_enabled
legacy_routes_enabled
legacy_write_monitoring_enabled
```

Ils sont contrôlés côté serveur et modifiables par environnement.

## 5. Lots de migration

### Lot A — Infrastructure de migration

Migrations proposées :

```text
2026_08_01_000001_create_migration_runs_table.php
2026_08_01_000002_create_legacy_migration_records_table.php
2026_08_01_000003_create_feature_flags_table.php
```

#### `migration_runs`

- `id` UUID ;
- `name` ;
- `environment` ;
- `status` ;
- `started_at`, `completed_at` ;
- `initiated_by` ;
- `source_counts` JSONB ;
- `target_counts` JSONB ;
- `report_path` ;
- `error_summary` ;
- timestamps.

#### `legacy_migration_records`

- `id` UUID ;
- `migration_run_id` ;
- `source_table` ;
- `source_id` ;
- `target_table` ;
- `target_id` ;
- `source_checksum` ;
- `target_checksum` ;
- `status` ;
- `error` ;
- timestamps.

Unique :

```text
(source_table, source_id, target_table)
```

Cette table rend les backfills relançables et auditables.

### Lot B — Identité et organisations

Migrations proposées :

```text
2026_08_02_000001_expand_users_for_saas.php
2026_08_02_000002_create_organizations_table.php
2026_08_02_000003_create_organization_members_table.php
2026_08_02_000004_create_organization_invitations_table.php
2026_08_02_000005_create_roles_and_permissions_tables.php
```

#### Expansion de `users`

Ajouter sans supprimer `name` :

- `first_name` nullable ;
- `last_name` nullable ;
- `phone` nullable ;
- `phone_verified_at` nullable ;
- `status` avec valeur par défaut compatible ;
- `locale` ;
- `timezone` nullable au départ ;
- `last_login_at` ;
- `deleted_at`.

Backfill :

- copier `name` vers `first_name` si aucune séparation fiable ;
- laisser `last_name` vide ;
- conserver `name` pour compatibilité ;
- convertir `is_active = false` vers `status = suspended`.

Le découpage automatique du nom complet est interdit : il serait culturellement fragile.

### Lot C — Catalogue et événements

Migrations proposées :

```text
2026_08_03_000001_create_event_categories_table.php
2026_08_03_000002_create_event_types_table.php
2026_08_03_000003_create_modules_table.php
2026_08_03_000004_create_event_type_modules_table.php
2026_08_03_000005_create_events_table.php
2026_08_03_000006_create_event_members_and_roles_tables.php
2026_08_03_000007_create_event_settings_table.php
2026_08_03_000008_create_event_modules_table.php
2026_08_03_000009_create_event_custom_fields_tables.php
```

Seeders idempotents :

```text
EventCategorySeeder
EventTypeSeeder
ModuleCatalogSeeder
EventTypeModuleSeeder
PermissionCatalogSeeder
SystemRoleSeeder
```

Les seeders recherchent les enregistrements par slug stable et ne changent pas un prix ou une configuration administrée sans version explicite.

### Lot D — Colonnes de transition sur les modules existants

Migrations proposées :

```text
2026_08_04_000001_add_tenant_columns_to_weddings.php
2026_08_04_000002_add_tenant_columns_to_guests.php
2026_08_04_000003_add_tenant_columns_to_wedding_tables.php
2026_08_04_000004_add_tenant_columns_to_menu_items.php
2026_08_04_000005_add_tenant_columns_to_orders.php
2026_08_04_000006_add_tenant_columns_to_photos.php
2026_08_04_000007_add_tenant_columns_to_timeline_events.php
2026_08_04_000008_add_tenant_columns_to_wedding_notifications.php
```

Ajouter d’abord :

```text
organization_id UUID nullable
event_id UUID nullable
migrated_at timestamp nullable
migration_run_id UUID nullable
```

Index temporaires :

```text
(organization_id)
(event_id)
(event_id, status) si status existe
```

Ne pas encore ajouter `NOT NULL`.

### Lot E — Invitations, RSVP et médias normalisés

Migrations proposées :

```text
2026_08_05_000001_create_invitation_templates_table.php
2026_08_05_000002_create_invitation_themes_table.php
2026_08_05_000003_create_invitations_table.php
2026_08_05_000004_create_invitation_recipients_table.php
2026_08_05_000005_create_rsvps_table.php
2026_08_05_000006_create_galleries_and_media_tables.php
2026_08_05_000007_create_activity_logs_table.php
2026_08_05_000008_create_notifications_and_deliveries_tables.php
```

Colonnes de compatibilité :

- `invitation_recipients.legacy_guest_id` unique nullable ;
- `media.legacy_photo_id` unique nullable ;
- `notifications.legacy_notification_id` unique nullable.

### Lot F — Onboarding et commercial

Migrations proposées :

```text
2026_08_06_000001_create_onboarding_sessions_table.php
2026_08_06_000002_create_onboarding_step_snapshots_table.php
2026_08_06_000003_create_plans_and_features_tables.php
2026_08_06_000004_create_pricing_rules_and_quotes_tables.php
2026_08_06_000005_create_subscriptions_and_items_tables.php
2026_08_06_000006_create_payments_and_attempts_tables.php
2026_08_06_000007_create_invoices_table.php
2026_08_06_000008_create_coupons_tables.php
2026_08_06_000009_create_payment_webhook_events_table.php
```

Ce lot crée les structures mais n’active pas la facturation tant que les passerelles et tests ne sont pas prêts.

### Lot G — Contraintes après backfill

Migrations proposées uniquement après validation :

```text
2026_08_20_000001_enforce_tenant_constraints.php
2026_08_20_000002_enforce_event_constraints.php
2026_08_20_000003_add_composite_tenant_indexes.php
2026_08_20_000004_add_public_token_indexes.php
```

Actions :

- clés étrangères ;
- `NOT NULL` ;
- unicités composites ;
- check constraints ;
- index de production.

Sur PostgreSQL, les index lourds sont créés `CONCURRENTLY` dans des migrations non transactionnelles.

## 6. Conversion des données historiques

### 6.1 Commandes Artisan

Commandes proposées :

```text
planivo:migration:inventory
planivo:migration:seed-catalog
planivo:migration:backfill-organizations
planivo:migration:backfill-events
planivo:migration:backfill-memberships
planivo:migration:backfill-event-resources
planivo:migration:backfill-invitations
planivo:migration:backfill-media
planivo:migration:verify
planivo:migration:report
planivo:migration:rollback-run
```

Options communes :

```text
--run=<uuid>
--dry-run
--chunk=500
--wedding=<uuid>
--organization=<uuid>
--resume
--fail-fast
--report=<path>
```

### 6.2 Création des organisations

Algorithme :

1. Charger le fichier de mapping validé.
2. Vérifier que chaque propriétaire existe et est actif.
3. Créer ou retrouver l’organisation par slug.
4. Créer le membership propriétaire.
5. Enregistrer la correspondance.
6. Ne jamais rattacher automatiquement un manager sans mapping.

Si l’installation historique représente une seule organisation, tous les mariages peuvent être regroupés sous cette organisation. Si elle contient plusieurs clients, le mapping explicite est obligatoire.

### 6.3 Conversion `weddings` vers `events`

Mapping :

| weddings | events | Transformation |
|---|---|---|
| id | legacy_wedding_id | copie |
| title | name | copie |
| title | slug | slug + résolution d’unicité |
| date | starts_at | date + heure par défaut configurée |
| venue | venue_name | copie |
| venue_address | venue_address | copie |
| cover_image | cover temporaire | résolu ensuite vers media |
| status | status | table de mapping |
| max_guests | estimated_guests | entier >= 0 |
| notes | event_settings/internal notes | copie contrôlée |
| invitation_custom | event_settings/branding | conversion versionnée |

Valeurs ajoutées :

- `event_type_id` = type `wedding` ;
- `organization_id` depuis mapping ;
- `timezone` depuis mapping ;
- `format` = `physical` sauf configuration contraire ;
- `visibility` = `invitation` par défaut.

Mapping des statuts :

```text
planning  → active ou draft selon configuration
active    → active
completed → completed
cancelled → cancelled
unknown   → draft + anomalie
```

La date historique ne contenant pas d’heure, le rapport marque `starts_at` comme valeur enrichie à confirmer.

### 6.4 Backfill des ressources événementielles

Pour chaque table fille :

1. retrouver `events.legacy_wedding_id = source.wedding_id` ;
2. renseigner `organization_id` et `event_id` sur la ligne existante ;
3. vérifier la cohérence des références ;
4. enregistrer checksum et statut ;
5. continuer par chunks.

Tables :

```text
guests
wedding_tables
menu_items
orders
photos
timeline_events
wedding_notifications
```

Cette approche ne duplique pas les lignes opérationnelles pendant la première transition.

### 6.5 Memberships

Mapping des rôles :

| Rôle historique | Rôle cible |
|---|---|
| admin | owner ou organization_admin selon mapping |
| manager | event_organizer |
| server | catering_operator |
| door | access_controller |

Règles :

- Un utilisateur avec `wedding_id` rejoint l’organisation de l’événement correspondant.
- Il reçoit un `event_member`.
- Un admin propriétaire est membre de l’organisation.
- Un admin global ne devient super administrateur que par configuration explicite.
- Un utilisateur non-admin sans `wedding_id` est mis en anomalie et ne reçoit pas d’accès global.
- Les comptes inactifs migrent avec membership suspendu.

### 6.6 Modules activés

Modules systématiques pour un mariage migré :

```text
guests
invitations
rsvps
notifications
```

Modules activés selon les données :

| Condition | Module |
|---|---|
| wedding_tables > 0 | seating |
| menu_items > 0 ou orders > 0 | catering |
| timeline_events > 0 | schedule |
| photos > 0 | media + gallery |
| invitations personnalisées | invitations |
| agents `door` | qr_access |
| agents `server` | catering |

La source d’activation est `legacy_migration`.

### 6.7 Invitations

Pour chaque guest avec `invitation_link` :

1. créer ou retrouver une invitation événementielle compatible ;
2. créer un `invitation_recipient` ;
3. stocker `hash(invitation_link)` dans `token_hash` ;
4. conserver `legacy_guest_id` ;
5. ne pas copier le jeton brut dans la nouvelle table ;
6. maintenir l’ancien endpoint pendant la compatibilité.

Le resolver v2 :

```text
jeton brut reçu
  → hash
  → invitation_recipients.token_hash
  → sinon fallback guests.invitation_link
  → journaliser fallback
```

Les doublons de `invitation_link` bloquent la bascule et génèrent une anomalie.

### 6.8 RSVP

Mapping :

```text
invited/pending → aucun RSVP ou pending
attending       → attending
confirmed       → attending
declined        → declined
unknown         → anomalie
```

`rsvp_message` et préférences sont copiés dans les champs autorisés. La donnée source n’est pas supprimée.

### 6.9 Médias

Pour chaque `photos` :

- créer `media` avec `legacy_photo_id` ;
- rattacher organisation et événement ;
- conserver URL source ;
- détecter MIME et taille si le fichier existe ;
- placer les fichiers manquants en anomalie ;
- créer une galerie par défaut ;
- ne pas déplacer physiquement le fichier pendant le premier backfill.

Le déplacement vers stockage objet est un job séparé et relançable.

### 6.10 Notifications

Les notifications historiques deviennent des notifications événementielles. L’ancien booléen `is_read` est conservé comme état de migration, puis les nouvelles lectures utilisent `notification_deliveries`.

## 7. Idempotence du backfill

Chaque transformation :

1. calcule le checksum des champs source pertinents ;
2. cherche une correspondance existante ;
3. compare le checksum ;
4. crée, met à jour ou ignore ;
5. écrit un résultat dans `legacy_migration_records`.

États :

```text
pending
migrated
updated
skipped
warning
failed
rolled_back
```

Une relance ne crée jamais un second événement pour le même `weddings.id`.

## 8. Dual-read

### Étape 1

Les lectures restent historiques. Les nouvelles données sont observées en arrière-plan.

### Étape 2

Lecture v2 puis fallback v1 :

```php
$event = $eventRepository->find($eventId);

if (! $event && Feature::enabled('legacy_routes_enabled')) {
    $event = $legacyWeddingAdapter->findAsEvent($legacyWeddingId);
}
```

Chaque fallback produit une métrique :

```text
legacy_read_fallback_total{resource, environment}
```

### Étape 3

Lecture miroir sur un échantillon :

- lire v1 et v2 ;
- normaliser ;
- comparer ;
- retourner v1 tant que le flag n’est pas activé ;
- enregistrer les divergences sans exposer les données personnelles.

### Étape 4

Retourner v2. Garder le fallback uniquement pour les liens historiques.

## 9. Dual-write

Le dual-write est implémenté dans les services applicatifs, pas dans le frontend et pas avec des triggers permanents.

### Ressources existantes

Pour les tables auxquelles on ajoute `organization_id` et `event_id`, il s’agit d’une seule ligne :

- la nouvelle écriture exige le `TenantContext` ;
- le service remplit les nouvelles colonnes ;
- `wedding_id` reste synchronisé depuis `events.legacy_wedding_id` pendant la transition.

### `weddings` et `events`

`LegacyEventBridge` assure temporairement :

- création event → création wedding de compatibilité si nécessaire ;
- mise à jour event → mise à jour des champs historiques compatibles ;
- mise à jour legacy → événement, tant que les anciennes interfaces écrivent encore.

Les champs sans équivalent historique ne sont jamais supprimés.

### Invitations

Une réponse via un ancien lien :

1. met à jour le guest historique ;
2. crée une entrée RSVP v2 ;
3. utilise une clé d’idempotence ;
4. compare les deux résultats.

### Gestion des échecs

Une transaction couvre les écritures dans une même base. Si une écriture asynchrone est nécessaire, utiliser un outbox transactionnel :

```text
outbox_messages
  id
  organization_id
  event_id
  type
  payload
  idempotency_key
  available_at
  processed_at
```

## 10. Contrôles de cohérence

### 10.1 Comptages

Pour chaque mariage :

```text
1 wedding = 1 event
guests source = guests avec event_id
wedding_tables source = tables avec event_id
menu_items source = menus avec event_id
orders source = orders avec event_id
photos source = media avec legacy_photo_id
timeline_events source = programmes avec event_id
notifications source = notifications avec legacy id
```

### 10.2 Références

- Chaque enfant a le même `organization_id` que son événement.
- Chaque `event_id` appartient à l’organisation indiquée.
- Chaque user historique mappé possède un membership valide.
- Chaque table assignée appartient au même événement que le guest.
- Chaque order et guest référencés partagent le même événement.
- Chaque invitation recipient pointe vers le bon guest.

### 10.3 Checksums

Les checksums ignorent :

- timestamps techniques ;
- champs enrichis ;
- ordre JSON non significatif.

Ils incluent :

- identifiants ;
- tenant/event ;
- contenu métier ;
- statuts ;
- références.

### 10.4 Rapport

Le rapport final contient :

```text
résumé
comptages source/cible
durée
chunks traités
éléments ignorés
warnings
erreurs
orphelins
divergences de checksum
fallbacks encore utilisés
recommandation go/no-go
```

## 11. Tests de migration

### 11.1 Tests unitaires

- mapping des statuts ;
- mapping des rôles ;
- conversion des dates et fuseaux ;
- checksums ;
- résolution des modules ;
- hash des jetons ;
- idempotence des transformations.

### 11.2 Tests fonctionnels

- migration d’un mariage complet ;
- migration sans photo ;
- migration sans utilisateur assigné ;
- migration avec jeton dupliqué ;
- reprise après erreur au milieu d’un chunk ;
- relance complète sans doublons ;
- RSVP via ancien lien après migration ;
- accès à l’événement migré ;
- permissions des anciens rôles ;
- désactivation d’un compte.

### 11.3 Tests d’isolation

- utilisateur A ne lit pas l’organisation B ;
- manager historique ne reçoit pas un accès global ;
- agent d’accueil ne lit pas un autre événement ;
- payload avec faux `organization_id` est ignoré/refusé ;
- cache hors ligne d’un ancien compte n’est pas réutilisé ;
- job avec mauvais tenant échoue avant traitement.

### 11.4 Tests de rollback

- rollback avant backfill ;
- rollback d’un run sans nouvelles écritures ;
- bascule de lecture v2 vers v1 ;
- désactivation du dual-write ;
- restauration complète depuis sauvegarde ;
- liens historiques encore fonctionnels après rollback applicatif.

### 11.5 Tests de charge

- backfill de 100 000 invités ;
- index créés sans blocage excessif ;
- dual-read sur dashboard ;
- synchronisation hors ligne ;
- génération du rapport ;
- taille et rétention des logs de migration.

## 12. Rollback

### Niveau 1 — Rollback applicatif

Actions :

- désactiver `event_reads_v2_enabled` ;
- remettre les lectures v1 ;
- conserver les tables v2 ;
- laisser les jobs terminer ou les suspendre proprement ;
- ne supprimer aucune donnée.

Durée cible : moins de 10 minutes.

### Niveau 2 — Rollback d’un backfill

Possible uniquement si :

- le run est identifié ;
- aucune écriture utilisateur v2 n’a été créée sur les cibles ;
- les dépendances ont été vérifiées.

La commande supprime ou marque les cibles du `migration_run_id`, dans l’ordre inverse des dépendances.

Si des écritures v2 existent, le rollback devient une réconciliation et non une suppression automatique.

### Niveau 3 — Restauration de base

Utilisée en cas de corruption :

1. passer en maintenance ;
2. arrêter workers et scheduler ;
3. capturer une sauvegarde de diagnostic ;
4. restaurer le snapshot validé ;
5. restaurer les médias ;
6. vérifier les checksums ;
7. redémarrer en version v1 ;
8. produire un rapport d’incident.

### Migrations `down()`

Les `down()` des lots additifs peuvent supprimer des tables vides en développement. En production, ils ne sont pas le mécanisme principal de rollback après backfill.

## 13. Déploiement progressif

### Étape 0 — Répétition

- clone anonymisé de production ;
- PostgreSQL cible ;
- backfill chronométré ;
- restauration testée ;
- rapport validé.

### Étape 1 — Expand

- déployer migrations A à F ;
- flags désactivés ;
- aucun changement visible ;
- surveiller temps de migration et erreurs.

### Étape 2 — Backfill initial

- exécuter par petits chunks ;
- commencer par un événement canari ;
- vérifier les rapports ;
- traiter les anomalies ;
- reprendre jusqu’à 100 %.

### Étape 3 — Tenant enforcement

- activer le contexte tenant pour les utilisateurs internes ;
- commencer par un compte de test ;
- étendre aux admins ;
- étendre aux managers et agents ;
- surveiller les refus 403/404.

### Étape 4 — Dual-read

- miroir 1 % ;
- puis 10 % ;
- puis 50 % ;
- puis 100 % ;
- seuil de divergence requis : 0 critique.

### Étape 5 — Dual-write

- nouvelles colonnes sur les ressources ;
- événements ;
- invitations/RSVP ;
- surveillance des divergences ;
- correction avant cutover.

### Étape 6 — Cutover

- lectures v2 par défaut ;
- anciennes routes actives ;
- fallback journalisé ;
- support renforcé.

### Étape 7 — Contraintes

- traiter les lignes nulles ;
- ajouter FK et `NOT NULL` ;
- créer index ;
- relancer les tests d’isolation.

### Étape 8 — Observation

Période recommandée : au moins 30 jours ou un cycle événementiel représentatif.

Critères :

- aucun fallback non expliqué ;
- aucun écart de comptage ;
- aucun incident tenant ;
- aucune perte de lien d’invitation ;
- aucune opération hors ligne attribuée au mauvais contexte.

### Étape 9 — Contract

Projet séparé et approuvé :

- retrait des écritures v1 ;
- archivage des colonnes ;
- renommages éventuels ;
- suppression de `users.wedding_id` ;
- suppression finale des tables obsolètes.

## 14. Observabilité

Métriques :

```text
migration_records_total{status,source_table}
migration_duration_seconds{command}
migration_checksum_mismatch_total{resource}
legacy_read_fallback_total{resource}
dual_write_failure_total{resource}
tenant_access_denied_total{route,role}
offline_context_mismatch_total
invitation_legacy_fallback_total
```

Logs structurés :

- `migration_run_id` ;
- `organization_id` ;
- `event_id` ;
- source/target ;
- command ;
- chunk ;
- correlation id ;
- exception sans donnée personnelle.

Alertes :

- divergence de checksum ;
- échec répété d’un chunk ;
- enfant sans événement ;
- write v1/v2 divergent ;
- hausse anormale des refus ;
- utilisation prolongée des fallbacks.

## 15. Sécurité pendant la migration

- Exécution réservée aux opérateurs autorisés.
- Confirmation explicite de l’environnement.
- Refus d’exécution en production sans `--run` et sauvegarde enregistrée.
- Rapports privés et chiffrés si nécessaire.
- Jetons bruts exclus des logs.
- Données personnelles expurgées.
- Commandes destructrices derrière une confirmation et une fenêtre de maintenance.
- Credentials de migration à privilèges minimaux.
- Audit de toutes les commandes.

## 16. Performance du backfill

- `chunkById`, jamais `offset` sur de gros volumes ;
- transactions par chunk ;
- limites configurables ;
- pas d’événement Eloquent inutile pendant backfill ;
- jobs optionnels pour médias ;
- index après chargement massif si cela réduit le temps total ;
- analyse PostgreSQL après migration ;
- surveillance des verrous ;
- pause automatique si latence production trop élevée.

Le backfill ne doit pas utiliser les controllers HTTP.

## 17. Critères go/no-go

### Go pour dual-read

- inventaire sans anomalie critique ;
- tous les événements migrés ;
- 100 % des enfants ont tenant/event ;
- checksums valides ;
- tests d’isolation verts ;
- sauvegarde restaurable.

### Go pour cutover

- dual-read sans divergence critique ;
- dual-write stable ;
- liens historiques fonctionnels ;
- caches hors ligne v2 validés ;
- runbook support disponible ;
- rollback applicatif testé.

### No-go immédiat

- ressource accessible depuis un autre tenant ;
- utilisateur non mappé avec accès global ;
- jetons dupliqués non résolus ;
- divergence de paiement ;
- sauvegarde non restaurable ;
- écritures v2 non réconciliables.

## 18. Livrables d’implémentation de la phase suivante

La phase 4 commence par un premier incrément vertical :

1. migrations des lots A à D ;
2. modèles Organization/Event/Membership ;
3. `TenantContext` et policies ;
4. commandes d’inventaire et backfill ;
5. tests d’isolation ;
6. adaptateur `Wedding` → `Event` ;
7. navigation organisation/événement ;
8. feature flags.

La facturation, les paiements et l’onboarding complet arrivent après validation de cette fondation.

## 19. Checklist opérateur

### Avant

- [ ] sauvegarde logique créée ;
- [ ] restauration testée ;
- [ ] médias sauvegardés ;
- [ ] inventaire généré ;
- [ ] mapping validé ;
- [ ] propriétaire de chaque organisation confirmé ;
- [ ] anomalies critiques résolues ;
- [ ] fenêtre et communication approuvées.

### Pendant

- [ ] workers contrôlés ;
- [ ] métriques suivies ;
- [ ] chunks sans erreur ;
- [ ] checksums comparés ;
- [ ] rapport intermédiaire archivé ;
- [ ] aucun verrou prolongé.

### Après

- [ ] comptages source/cible égaux ;
- [ ] tests d’isolation verts ;
- [ ] anciens liens testés ;
- [ ] accès terrain testés ;
- [ ] synchronisation hors ligne testée ;
- [ ] rapport final signé ;
- [ ] décision go/no-go enregistrée.

## 20. Conclusion

La migration doit d’abord créer une frontière tenant fiable autour des fonctionnalités existantes. Elle ne doit pas tenter de livrer simultanément tous les nouveaux modules SaaS.

Le premier objectif technique est de pouvoir démontrer, par contraintes et tests, que chaque donnée historique appartient à une organisation et à un événement précis. Une fois cette propriété garantie, les modules, l’onboarding et la facturation peuvent être développés sans reproduire les risques du modèle actuel.
