# Planivo — Audit préalable à la transformation SaaS

Date de l’audit : 28 juillet 2026  
Périmètre : application Laravel/React présente dans ce dépôt  
Statut : Phase 1 terminée — conception détaillée et migrations non commencées

## 1. Synthèse exécutive

Planivo est aujourd’hui une application mono-produit centrée sur le mariage, avec une base fonctionnelle exploitable :

- gestion des mariages ;
- invités et RSVP ;
- invitations personnalisées et liens publics ;
- tables et plan de salle ;
- menus et commandes ;
- programme ;
- galerie ;
- notifications opérationnelles ;
- comptes d’équipe avec quatre rôles ;
- interfaces dédiées aux serveurs et aux agents d’accueil ;
- fonctionnement PWA avec cache et synchronisation hors ligne partielle.

L’application n’est pas encore un SaaS multi-tenant. Elle ne possède ni organisations, ni adhésions, ni événements génériques, ni catalogue de modules, ni plans, ni abonnements, ni paiements. Le modèle d’autorisation actuel repose sur un rôle global et un éventuel `wedding_id` porté par l’utilisateur.

La recommandation est une migration progressive de type **expand → migrate → dual-read/dual-write → cutover → contract**. Il ne faut ni renommer brutalement toutes les tables, ni supprimer les tables historiques avant rapprochement et validation des données.

### Décision de passage

Le passage au développement SaaS est conditionné par trois prérequis :

1. corriger l’isolation des accès et les fuites possibles entre événements ;
2. stabiliser le socle avec validation backend, pagination et tests d’autorisation ;
3. introduire `organizations`, `organization_members`, `events` et `event_members` avant les modules commerciaux.

## 2. Méthode et périmètre

L’audit couvre :

- les 35 routes applicatives ;
- 16 migrations métier et techniques déjà exécutées ;
- 17 tables SQLite présentes ;
- les contrôleurs, middlewares, modèles, entités et repositories PHP ;
- les pages, composants, hooks, client API et stockage hors ligne React ;
- les tests automatisés ;
- la configuration d’authentification, de session, de fichiers et de queues ;
- l’état réel de la base locale, sans lecture ni exposition des données personnelles.

État local observé :

| Table | Lignes |
|---|---:|
| weddings | 1 |
| guests | 14 |
| wedding_tables | 6 |
| menu_items | 13 |
| orders | 6 |
| photos | 3 |
| timeline_events | 7 |
| wedding_notifications | 2 |
| users | 5 |

Ces données doivent être considérées comme des données historiques à préserver lors de la migration.

## 3. Architecture actuelle

```text
Navigateur / PWA React
  ├─ Inertia pour les pages privées
  ├─ Axios + client générique base44
  ├─ TanStack Query
  └─ IndexedDB pour cache et file hors ligne
                │
                ▼
Laravel 13
  ├─ routes web + session
  ├─ API publique par jeton ou UUID
  ├─ API générique /api/entities/{entity}
  ├─ contrôle global par rôle
  └─ contrôleurs
                │
                ▼
Entités Domain\Wedding + interfaces de repository
                │
                ▼
Repositories Eloquent + modèles anémiques
                │
                ▼
SQLite local
```

### Points positifs

- Séparation partielle entre domaine et persistance.
- Interfaces de repository déjà disponibles pour huit agrégats.
- UUID utilisés sur les principales tables métier.
- Clés étrangères avec suppression en cascade depuis `weddings`.
- Hash automatique des mots de passe dans `User`.
- Régénération de session après connexion et invalidation à la déconnexion.
- Protection CSRF conservée pour l’API authentifiée par l’ajout du middleware `web`.
- Files de jobs et tables de jobs déjà disponibles.
- Idempotence partielle des commandes hors ligne via `offline_uuid`.
- Composants UI réutilisables et mise en page responsive.
- Build de production fonctionnel.

### Limites structurelles

- Le domaine entier se trouve sous `Domain\Wedding`.
- `EntityController` concentre routage dynamique, autorisation, hydratation par réflexion, validation partielle et logique métier.
- `CommandBus` et `QueryBus` sont enregistrés mais aucun cas d’usage métier ne les exploite.
- Les modèles Eloquent utilisent `guarded = []`.
- Les relations Eloquent sont absentes ; les jointures et contraintes métier sont réalisées manuellement.
- Les pages React appellent directement un client d’entités générique.
- Les types frontend utilisent largement `any`.

## 4. Modules fonctionnels existants

| Module | État | Réutilisabilité SaaS |
|---|---|---|
| Authentification par session | Fonctionnel, incomplet | À conserver et renforcer |
| Gestion des mariages | Fonctionnel | À adapter vers `Event` |
| Invités | Fonctionnel | Très réutilisable |
| RSVP | Fonctionnel, simple | À extraire en module |
| Invitations publiques | Fonctionnel, couplé au guest | À refondre en moteur d’invitations |
| Tables / placement | Fonctionnel | Module optionnel |
| Menus | Fonctionnel | Module optionnel |
| Commandes sur place | Fonctionnel | Module restauration/service |
| Programme | Fonctionnel | Module générique |
| Galerie | Fonctionnel | À migrer vers galleries/media |
| Notifications | Fonctionnel, événementiel | À centraliser |
| Agents et rôles | Fonctionnel, global | À remplacer par memberships/permissions |
| Contrôle d’accès | Partiel | À consolider autour de tickets/check-ins |
| QR codes | Partiel | À généraliser et sécuriser |
| Mode hors ligne | Partiel | À conserver après cloisonnement |
| Landing commerciale | Absente | À créer |
| Inscription/onboarding | Absent | À créer |
| Organisations/multi-tenant | Absent | À créer en priorité |
| Types d’événements | Absent | À créer |
| Modules activables | Absent | À créer |
| Budget/dépenses | Absent | À créer |
| Stock/mouvements | Absent | À créer |
| Prestataires/contrats | Absent | À créer |
| Plans/tarification | Absent | À créer |
| Paiements/factures | Absent | À créer |
| Super administration SaaS | Absente | À créer |

Le périmètre réellement implémenté est donc inférieur au périmètre fonctionnel annoncé dans le brief initial. Il ne faut pas planifier une migration de données pour des modules qui n’existent pas encore dans cette base.

## 5. Couplage au mariage

### Backend

Le couplage est présent dans :

- le namespace `Domain\Wedding` ;
- les entités `Wedding`, `WeddingTable`, `WeddingNotification` ;
- les tables et colonnes `weddings`, `wedding_tables`, `wedding_notifications`, `wedding_id` ;
- `PublicWeddingController` ;
- le registre d’entités de `EntityController` ;
- les repositories et bindings du conteneur ;
- `users.wedding_id`.

### Frontend

Le couplage est présent dans :

- `useWedding` et `WeddingSelector` ;
- les noms d’entités exposés par `base44Client` ;
- les clés de cache `weddings` et `activeWeddingId` ;
- les libellés « mariage » dans le dashboard et l’éditeur d’invitation ;
- les pages qui exigent systématiquement un `activeWeddingId` ;
- la base IndexedDB historique `wedding-velour-offline`.

### Données et comportements spécifiques

- La date d’un mariage est obligatoire et ne comprend ni heure ni fuseau.
- `max_guests` est directement porté par le mariage.
- La personnalisation d’invitation est un JSON unique dans `weddings.invitation_custom`.
- Le rôle d’un utilisateur est global ; un utilisateur ne peut pas avoir des rôles différents selon l’organisation ou l’événement.
- Les tables, menus, commandes, photos, programmes et notifications dépendent tous directement de `wedding_id`.

## 6. Audit du modèle de données

### Forces

- Les enregistrements métier utilisent des UUID.
- Les tables filles principales référencent `weddings` avec cascade.
- `users.email`, `orders.offline_uuid` et `wedding_notifications.source_key` sont uniques.
- Les préférences structurées utilisent déjà JSON.

### Lacunes

- Aucun `organization_id`.
- Aucun catalogue d’événements ou de modules.
- Aucun membre d’organisation ou membre d’événement.
- Aucun modèle d’invitation séparé de l’invité.
- Aucun historique de RSVP.
- Aucun journal d’activité.
- Aucun soft delete ni archivage métier.
- Aucun index explicite sur les `wedding_id`, `status`, `invitation_link`, `table_id`, `guest_id` ou dates métier.
- `guests.table_id`, `orders.table_id` et `orders.guest_id` sont des chaînes sans clés étrangères.
- `invitation_link` n’est ni unique, ni indexé, ni daté, ni révocable.
- Les statuts sont des chaînes libres sans enums ni contraintes SQL.
- La date seule ne permet pas les événements virtuels, hybrides, multi-jours ou multi-fuseaux.
- Les photos stockent directement des URLs sans métadonnées de fichier, taille, MIME, visibilité ou tenant.
- La lecture de notification est globale sur l’enregistrement et non par destinataire.

### Cartographie de migration recommandée

| Existant | Cible | Stratégie |
|---|---|---|
| weddings | events | Créer `events`, copier et conserver la correspondance |
| users.wedding_id | organization_members + event_members | Backfill puis déprécation |
| wedding_tables | event_tables | Ajouter `event_id`, dual-write, renommer plus tard |
| guests | guests + invitations + rsvps | Séparer identité, invitation et réponse |
| menu_items | event_menu_items | Module restauration |
| orders | event_orders/service_requests | Conserver `offline_uuid` |
| photos | galleries + media | Copier URL et générer métadonnées |
| timeline_events | event_schedule_items | Généraliser heure/date/fuseau |
| wedding_notifications | notifications + notification_deliveries | Conserver `source_key` |
| weddings.invitation_custom | event_settings + invitation_themes | Convertir le JSON avec version de schéma |

## 7. Sécurité et isolation

### Critiques — P0

1. **Absence de véritable isolation tenant.** Un administrateur voit toutes les données. Un manager sans `wedding_id` reçoit également toutes les données lors des listes.
2. **Accès direct non cloisonné.** `EntityController::show()` et `destroy()` ne vérifient pas que l’objet appartient au mariage de l’utilisateur. Les rôles terrain peuvent lire un objet d’un autre mariage s’ils connaissent son UUID ; un manager peut supprimer un objet hors de son périmètre.
3. **Cache hors ligne non lié à l’utilisateur ou au tenant.** Les réponses API sont indexées uniquement par URL. Sur un appareil partagé, un autre compte peut lire les données en cache du compte précédent.
4. **File de synchronisation non liée à l’identité.** Une opération créée hors ligne peut être rejouée après une reconnexion sous un autre compte ou tenant.
5. **Pages authentifiées mises en cache.** Le service worker peut conserver des réponses HTML privées après déconnexion.
6. **Identifiants administrateur présents dans le code.** Le seeder contient une adresse et un mot de passe déterministes. Ils doivent être remplacés par une initialisation à secret externe et rotation obligatoire.
7. **Fuite de données via invitation.** L’endpoint public renvoie les co-invités de la table sous forme de modèles complets, avec un risque d’exposition d’e-mail, téléphone et informations alimentaires.

### Élevées — P1

- Aucun rate limiting explicite sur la connexion, RSVP, commandes publiques ou consultation par jeton.
- Les liens d’invitation n’ont ni expiration, ni révocation, ni hash au repos, ni usage unique.
- Les identifiants de table servent directement de secrets publics.
- L’API générique accepte `request->all()` et hydrate les entités par réflexion sans Form Requests.
- La création d’un invité contient une référence à des variables non définies (`existingData`, `updatedData`) et peut provoquer une erreur serveur.
- Les mots de passe créés par `AgentController` utilisent seulement `min:8`, sans la politique forte configurée pour la production.
- L’upload place les images sur un disque public commun, sans chemin tenant, quota, scan, journal ni politique d’accès.
- Les suppressions physiques en cascade peuvent effacer tout un événement sans restauration applicative.
- Les permissions sont quatre rôles globaux, sans capacités granulaires.
- La session sécurisée dépend de la configuration d’environnement ; aucune vérification de déploiement n’impose le cookie HTTPS.

### Moyennes — P2

- Les modèles ont `guarded = []`.
- Les statuts et rôles sont des chaînes.
- Pas de journal des actions sensibles.
- Pas de révocation centralisée des sessions.
- Pas de vérification d’e-mail.
- Pas de politique de confidentialité des médias et invitations.
- Pas de validation d’appartenance des `menu_preferences` au même événement.

## 8. Performance et scalabilité

### Problèmes constatés

- Toutes les listes sont chargées sans pagination.
- `serializeEntity()` relit la base pour chaque élément afin d’obtenir `created_at`, créant un N+1 systématique.
- Les repositories filtrent sur des colonnes reçues du client sans liste blanche.
- Plusieurs écrans chargent en parallèle des collections complètes.
- Le pseudo temps réel repose sur un polling toutes les trois secondes.
- Le calcul de capacité d’une table charge tous les invités concernés puis additionne en PHP.
- Le contrôle de capacité n’est pas protégé par transaction/verrou ; deux affectations concurrentes peuvent dépasser la capacité.
- Les principaux champs de filtrage n’ont pas d’index explicite.
- Les images ne sont ni redimensionnées, ni traitées en queue, ni accompagnées de miniatures garanties.
- SQLite convient au développement et à un petit déploiement, pas au SaaS commercial ciblé.

### Actions prioritaires

1. Introduire pagination, tri et filtres en liste blanche.
2. Retourner des API Resources depuis des requêtes Eloquent préchargées.
3. Ajouter les index tenant/événement et les index des jetons.
4. Remplacer le polling global par événements ciblés ou intervalle adaptatif.
5. Mettre les traitements média et invitations en queue.
6. Utiliser PostgreSQL ou MySQL en production.
7. Encapsuler les contraintes critiques dans des transactions.

## 9. Qualité du backend

### À conserver

- Les entités de domaine comme point de départ.
- Les interfaces de repository, après spécialisation par domaine.
- Les UUID.
- Les mécanismes d’idempotence `offline_uuid` et `source_key`.
- Le middleware de compte actif.
- La structure Laravel standard, les jobs et notifications natives disponibles.

### À refactoriser

- Remplacer `EntityController` par des contrôleurs ou actions par cas d’usage.
- Introduire Form Requests, Policies et Resources.
- Créer un `TenantContext` déterminé côté serveur.
- Appliquer automatiquement les scopes d’organisation et d’événement.
- Ajouter des relations Eloquent explicites.
- Déplacer la capacité des tables, RSVP, commandes et notifications vers des services/actions transactionnels.
- Remplacer les chaînes de statuts par enums PHP et contraintes.
- Transformer les rôles globaux en rôles de membership.

### À supprimer à terme

- Le routage générique d’entités exposé publiquement.
- L’hydratation par réflexion dans le contrôleur.
- `users.wedding_id` après migration complète.
- Les autorisations basées uniquement sur le frontend ou le rôle global.
- Le seeder avec mot de passe déterministe.
- Les anciens noms `Wedding*` après période de compatibilité.

## 10. Qualité du frontend

### État

- Environ 70 fichiers TSX.
- Plusieurs pages dépassent 200 lignes.
- `Invitation.tsx` atteint 1 241 lignes.
- `Tables.tsx`, `DoorAgent.tsx`, `FloorPlanEditor.tsx` et `Dashboard.tsx` sont également volumineux.
- Le client API et de nombreux composants utilisent `any`.
- Le menu est codé en dur par rôles et ne dépend pas des modules activés.
- Le typecheck remonte 50 erreurs.
- Le lint global remonte 491 problèmes, dont 490 erreurs.
- Le build Vite de production réussit malgré cette dette.

### À conserver

- Inertia pour les pages applicatives.
- TanStack Query.
- Les composants UI existants.
- La conception mobile et les interfaces terrain.
- L’état hors ligne, après cloisonnement par tenant/utilisateur.

### À refactoriser

- Organiser le code sous `features/`.
- Générer des types API fiables.
- Remplacer `base44Client` par des clients de domaine.
- Extraire l’éditeur d’invitation en composants et hooks.
- Construire le menu depuis les modules autorisés retournés par le backend.
- Déporter les règles métier au backend.
- Nommer les caches avec `organization_id`, `event_id` et `user_id`.
- Purger cache et file locale lors de la déconnexion ou du changement de tenant.

## 11. Tests et observabilité

### Couverture actuelle

Les tests couvrent :

- redirection des utilisateurs non authentifiés ;
- accès aux espaces par rôle ;
- gestion des agents par l’administrateur ;
- capacité des tables ;
- idempotence des commandes hors ligne ;
- création du compte administrateur.

Ils ne couvrent pas :

- accès direct à une ressource d’un autre mariage ;
- suppression hors périmètre ;
- confidentialité des endpoints publics ;
- création d’invité via l’API générique ;
- upload ;
- RSVP et invalidation des jetons ;
- déconnexion et purge du cache hors ligne ;
- concurrence sur la capacité ;
- organisations, événements, modules, onboarding, prix, paiement et abonnement.

### Observabilité absente

- pas de journal d’activité métier ;
- pas de traces structurées avec tenant/event ;
- pas de métriques applicatives ;
- pas de suivi des queues ;
- pas de suivi des webhooks ou paiements ;
- pas de service de remontée des erreurs frontend.

## 12. Dépendances et risques de régression

### Dépendances fortes

```text
weddings
  ├─ wedding_tables
  │    ├─ guests.table_id
  │    └─ orders.table_id
  ├─ guests
  │    ├─ invitation publique
  │    ├─ RSVP
  │    └─ orders.guest_id
  ├─ menu_items
  ├─ orders
  │    └─ wedding_notifications
  ├─ photos
  ├─ timeline_events
  └─ wedding_notifications

users.wedding_id ──► visibilité et sélection de l’événement
```

### Principaux risques

| Risque | Probabilité | Impact | Réponse |
|---|---|---|---|
| Fuite inter-tenant pendant la migration | Élevée | Critique | TenantContext, policies et tests négatifs avant exposition |
| Perte de données historiques | Moyenne | Critique | Tables parallèles, mapping, rapports et rollback |
| Double activation après paiement | Moyenne | Critique | Webhooks signés, idempotency keys, machine d’état |
| Rejeu hors ligne sous le mauvais compte | Élevée | Élevé | Namespace et signature par user/tenant |
| Rupture des liens d’invitation existants | Élevée | Élevé | Resolver de compatibilité et redirections |
| Régression des interfaces terrain | Moyenne | Élevé | Conserver les routes et adaptateurs pendant la transition |
| Dégradation des performances | Élevée | Élevé | Pagination/index avant montée en charge |
| Explosion de complexité des modules | Moyenne | Élevé | Catalogue limité et contrats de module |
| Incohérence de prix | Moyenne | Critique | Calcul backend versionné et snapshots |

## 13. Classification des éléments

### Conserver

- fonctionnalités actuelles métier ;
- UUID et données historiques ;
- PWA et interfaces mobiles ;
- idempotence des commandes ;
- composants UI ;
- structure Laravel/Inertia ;
- repositories comme frontières, après refonte ;
- routes historiques derrière une couche de compatibilité.

### Refactoriser

- `Wedding` vers `Event` ;
- rôles globaux vers memberships et permissions ;
- `EntityController` vers actions contrôlées ;
- API frontend générique vers clients par feature ;
- invitation JSON vers entités normalisées ;
- médias publics vers stockage tenant-aware ;
- mode hors ligne vers stockage cloisonné ;
- notifications vers un système multi-canal ;
- dashboard et navigation vers modules dynamiques.

### Supprimer, uniquement après validation

- mot de passe administrateur codé en dur ;
- accès générique non scopé ;
- caches hors ligne globaux ;
- `users.wedding_id` ;
- anciennes classes et tables `Wedding*` devenues sans appel ;
- endpoints de compatibilité après expiration annoncée.

### Créer

- Organizations, memberships, invitations de collaborateurs ;
- Events, event types, categories et settings ;
- catalogue de modules et activation par événement ;
- permissions granulaires ;
- onboarding sauvegardable ;
- plans, pricing, subscriptions, payments et invoices ;
- moteur d’invitations et RSVP normalisés ;
- activity logs et security logs ;
- super administration ;
- landing commerciale et pages publiques configurables ;
- services métier listés dans le brief ;
- tests d’isolation et de paiement.

## 14. Plan d’évolution recommandé

### Phase 0 — Stabilisation et sécurité

- Corriger les accès directs non scopés.
- Éliminer le seeder à secret déterministe.
- Corriger la création d’invité.
- Ajouter Form Requests et pagination aux endpoints existants.
- Cloisonner/purger le stockage hors ligne.
- Ajouter tests inter-événements négatifs.
- Ajouter rate limits et durcir les endpoints publics.

**Critère de sortie :** aucun accès à une ressource hors périmètre dans les tests automatisés.

### Phase 1 — Noyau multi-tenant

- Créer `organizations`, `organization_members`, `events`, `event_members`.
- Introduire `TenantContext`, middleware, policies et scopes.
- Créer une organisation par propriétaire historique.
- Créer un événement « Mariage » pour chaque mariage existant.
- Ajouter les colonnes `organization_id` et `event_id` sans supprimer `wedding_id`.

**Critère de sortie :** lecture/écriture via les nouveaux IDs avec rapprochement intégral.

### Phase 2 — Catalogue événementiel et modules

- Créer catégories, types, modules et recommandations.
- Ajouter champs personnalisés et tranches d’âge.
- Activer les modules existants sur les événements migrés.
- Rendre navigation et permissions dynamiques.

### Phase 3 — Onboarding, landing et invitations

- Construire la landing commerciale.
- Créer l’onboarding sauvegardable.
- Normaliser thèmes, modèles, invitations, destinataires et RSVP.
- Conserver un resolver pour les anciens `invitation_link`.

### Phase 4 — Tarification, abonnement et paiement

- Créer plans/features, pricing quotes, subscriptions, payments et invoices.
- Calculer les prix uniquement côté backend.
- Introduire webhooks signés et idempotents.
- Activer les événements dans une transaction après confirmation.

### Phase 5 — Modules complémentaires et super administration

- Ajouter budget, stock, tâches, personnel, prestataires et documents.
- Créer la super administration et les métriques commerciales.
- Mettre les médias, exports et envois massifs en queue.

### Phase 6 — Cutover et retrait de l’historique

- Comparer les données anciennes et nouvelles.
- Geler les anciennes écritures.
- Basculer les lectures.
- Observer une période de stabilité.
- Archiver, puis supprimer les structures historiques dans une version ultérieure.

## 15. Ordre des prochaines livraisons

La prochaine livraison doit être la **Phase 2 — Conception** du brief, avec :

1. architecture cible détaillée ;
2. modèle relationnel et diagramme des entités ;
3. stratégie de tenant context ;
4. matrice rôles/permissions ;
5. contrats du catalogue de modules ;
6. parcours onboarding ;
7. conventions d’événements, statuts et idempotence ;
8. décision PostgreSQL/MySQL et stratégie de déploiement.

Les migrations SQL ne doivent être écrites qu’après validation de cette conception.

## 16. Conclusion

Planivo possède un noyau opérationnel qu’il serait coûteux et risqué de réécrire. La trajectoire recommandée consiste à sécuriser ce noyau, introduire les organisations et événements en parallèle, puis migrer module par module.

Le principal risque n’est pas le changement de vocabulaire « mariage » vers « événement » ; c’est l’absence d’une frontière d’autorisation serveur fiable. Cette frontière doit devenir l’invariant central de toute la plateforme avant l’onboarding, les paiements ou la commercialisation.
