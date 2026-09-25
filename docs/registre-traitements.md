# Registre des activités de traitement — INFFLUNCH

Tenu au titre de l'art. 30 RGPD (modèle simplifié CNIL). Dernière mise à jour : 2026-09-19.

**Responsable du traitement** : Lucas Lambrechts (« LLS », éditeur non professionnel, initiative personnelle) — contact@infflunch.com. Pas de DPO, pas de représentant.
**Sous-traitants** : Supabase Inc. (base, auth, storage — eu-west-1, Irlande) · Render Services, Inc. (hébergement statique, États-Unis) · Cloudflare (Turnstile, page d'inscription) · IONOS (domaine + redirection de `contact@infflunch.com` vers la boîte pro de l'éditeur, UE).
**Transferts hors UE** : Render / Cloudflare — États-Unis (Data Privacy Framework). Aucune donnée de compte n'y est stockée : le site statique et le CAPTCHA ne reçoivent que l'IP / navigateur.
**Mesures de sécurité** : HTTPS, RLS Supabase (lectures réservées aux comptes authentifiés, écritures own/admin), mots de passe hachés (Supabase Auth), comptes créés manuellement par l'admin (domaine @infflux.com), clé service_role réservée aux Edge Functions.

---

## Fiche 1 — Gestion des comptes et demandes d'accès

| | |
|---|---|
| Finalité | Créer, authentifier et administrer les comptes des collaborateurs ; traiter les demandes de création / réinitialisation de mot de passe |
| Base légale | Exécution du service demandé (6.1.b) ; intérêt légitime — sécurité (6.1.f) |
| Personnes concernées | Collaborateurs INFFLUX (~100 max) |
| Données | E-mail pro, mot de passe haché, rôle (user/admin), avatar facultatif, date de création, `must_change_password` ; `waiting_list` : e-mail, type, état, date ; IP + empreinte navigateur transmises à Cloudflare Turnstile à l'inscription |
| Tables | `auth.users`, `users`, `profiles`, `waiting_list` ; bucket `avatars` |
| Destinataires | Admin (LLS) ; les autres collaborateurs voient e-mail formaté (`P.Nom`) et avatar |
| Conservation | Tant que la personne ne demande pas la suppression de son compte (décision du responsable, 2026-09-19 : pas de purge automatique ni au départ de la société — les contributions gardent leur utilité pour les collègues ; sur demande explicite : suppression du compte + effacement des données personnelles, contributions anonymisées — effacées si la personne le précise ; cf. journal ci-dessous). Demandes d'accès refusées : 12 mois max |
| Sécurité | Voir en-tête ; Edge Functions `admin-create-user` / `admin-delete-user` ; mdp temporaire transmis par Teams |

## Fiche 2 — Contributions (avis, photos, menus, favoris, réactions, déjeuner, succès)

| | |
|---|---|
| Finalité | Permettre aux collaborateurs de noter et commenter les restaurants, partager photos et menus, indiquer où ils déjeunent, débloquer des succès (gamification) |
| Base légale | Exécution du service demandé (6.1.b) |
| Personnes concernées | Collaborateurs disposant d'un compte |
| Données | Note 1-5 + commentaire, votes sur avis, réactions emoji, photos (WebP, attribution auteur), menus (lien/pdf/image), favoris, choix « je déjeune où » (resto + date, ou à défaut « pas de restaurant » / « pas sur site » — jamais le motif de l'absence), succès débloqués, horodatages |
| Tables | `reviews`, `review_votes`, `reactions`, `restaurant_photos`, `restaurant_menus`, `favorites`, `lunch_plans`, `user_achievements` ; bucket `restaurant-photos` |
| Destinataires | Tous les collaborateurs connectés ; modération admin |
| Conservation | Durée de vie du compte (suppression en cascade) ; `lunch_plans` du jour uniquement |
| Sécurité | RLS own-write / admin-delete ; 1 photo par personne et par resto ; contrôle qualité image |

## Fiche 3 — Demandes, suggestions et notifications

| | |
|---|---|
| Finalité | Recueillir les retours (bugs, suggestions) et prévenir des nouveautés par notification push |
| Base légale | Intérêt légitime — amélioration du service (6.1.f) ; **consentement** pour les push (admins seulement, retirable dans « Réglages ») |
| Personnes concernées | Collaborateurs disposant d'un compte |
| Données | Texte + images jointes (3 max), versions, état de traitement, fil de discussion auteur/admin ; abonnement push (endpoint, clés p256dh/auth, user agent) |
| Tables | `feedback`, `feedback_revisions`, `feedback_messages`, `push_subscriptions` ; `admin_notes` (backlog admin, peut citer un utilisateur) |
| Destinataires | Admin (LLS) ; l'auteur voit ses propres demandes |
| Conservation | Demandes : durée de vie du compte ; abonnement push : jusqu'au retrait du consentement, suppression du compte ou expiration de l'endpoint |
| Sécurité | RLS own-read/own-write ; Edge Function `notify-admins` (VAPID) |

---

## Traitements exclus / non mis en œuvre
- Aucune mesure d'audience, aucun cookie publicitaire, aucun profilage.
- Stockage local navigateur (session, thème, viewMode, nouveautés vues, dernier onglet) : traceurs strictement nécessaires, exemptés de consentement.
- Aucune donnée sensible (art. 9), aucun mineur, aucune décision automatisée.

## Journal des demandes d'exercice de droits
| Date | Personne | Droit exercé | Réponse le |
|---|---|---|---|
| | | | |
