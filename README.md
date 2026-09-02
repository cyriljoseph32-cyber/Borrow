# Borrow

**Rent the gear. Book the person who knows it.**

Marketplace de prêt entre particuliers pour Koh Samui : location d'équipement **et** réservation de sessions, dans une seule verticale (plongée, mer, sport, loisirs).

C'est ce qui différencie Borrow de Hygglo ou MyRent, qui ne font que des objets, et de Yepstr ou Yoopies, qui ne font que des services. Ici, la personne qui loue le détendeur est souvent celle qui peut t'emmener plonger avec.

---

## Stack

| Couche | Choix |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Style | Tailwind CSS v4, composants maison |
| Base | Supabase Postgres — RLS, contrainte d'exclusion anti-double-booking |
| Auth | Supabase Auth (lien magique) + vérification téléphone |
| Fichiers | Supabase Storage (4 buckets) |
| Paiement | Stripe Checkout (carte + PromptPay) |
| Hébergement | Vercel (+ Vercel Cron) |

---

## Démarrer

```bash
npm install
cp .env.example .env.local     # puis remplir les clés
npm run dev
```

### Base de données

```bash
npx supabase link --project-ref <REF>
npm run db:push                # applique supabase/migrations/*
# puis exécuter supabase/seed.sql dans le SQL editor (catégories de la niche)
```

Une fois le projet lié, régénérer les types et réintroduire le générique `<Database>`
dans `lib/supabase/*.ts` :

```bash
npm run db:types
```

### Variables d'environnement

Voir `.env.example`. Deux points d'attention :

- `SUPABASE_SERVICE_ROLE_KEY` ne sert que dans le webhook Stripe et la route cron. Jamais côté client.
- `STRIPE_ENABLE_PROMPTPAY` ne passe à `true` que si le compte Stripe est ouvert **en Thaïlande**. Sinon, seule la carte est proposée. Alternative locale si besoin : Opn Payments (ex-Omise) — toute la logique de paiement est isolée derrière l'interface `PaymentProvider` (`lib/payments/index.ts`), une seule implémentation à remplacer.

---

## Architecture

### Deux types d'annonces, un seul moteur de réservation

|  | **Objet** | **Service** |
|---|---|---|
| Prix | par jour (tarifs semaine/mois optionnels) | par session |
| Réservation | plage de dates | créneau proposé |
| Caution | oui | non |
| Photos remise/retour | obligatoires | non applicable |
| Disponibilité | dispo par défaut, le prêteur **bloque** | indispo par défaut, le prestataire **ouvre** |
| Certifications | non | oui, vérifiées à la main |

La règle de disponibilité inversée est délibérée : un objet dort dans un garage et est disponible sauf exception, alors que le temps d'une personne est rare et doit être ouvert explicitement.

### Règle de sécurité n°1

**Aucun client n'écrit jamais un statut de réservation.** Il n'existe aucune politique RLS d'`insert` ou d'`update` sur `bookings` : toutes les transitions passent par des fonctions Postgres `security definer` (`request_booking`, `respond_to_booking`, `cancel_booking`, `confirm_pickup`, `confirm_return`, `submit_review`, `open_dispute`).

Le prix ne se calcule jamais côté client non plus. `lib/pricing.ts` sert uniquement à l'affichage ; le montant qui fait foi est celui que `compute_price()` calcule dans `request_booking()`. Si tu changes un barème d'un côté, change-le de l'autre.

### Anti-double-booking, à deux niveaux

1. Une vérification applicative dans `request_booking()` (message d'erreur lisible).
2. Une contrainte d'exclusion GiST en base, qui rend le chevauchement **physiquement impossible**, quoi que fasse le code :

```sql
exclude using gist (listing_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
where (status = any (array['accepted','in_progress']))
```

### Paiement — ce que Borrow encaisse, et ce qu'il n'encaisse pas

Borrow ne prélève **que sa commission de service**, payée par l'emprunteur. Le loyer et la caution se règlent directement entre les parties à la remise, en espèces ou PromptPay.

Ce choix évite la question de la détention de fonds de tiers en Thaïlande et permet de livrer un MVP en jours plutôt qu'en semaines. Le schéma est néanmoins prêt pour le séquestre (colonnes `stripe_account_id`, statuts `authorized` / `captured`) : la v2 passera en Stripe Connect avec `capture_method: manual`, sans migration destructive.

Barème (satang en base, THB à l'affichage) :

| Valeur de la réservation | Frais emprunteur |
|---|---|
| < ฿1 000 | ฿49 |
| ฿1 000 – 2 999 | ฿99 |
| ฿3 000 – 5 999 | ฿179 |
| ฿6 000 – 11 999 | ฿299 |
| ≥ ฿12 000 | 2,5 %, plafond ฿900 |

Le prêteur ne paie rien au pilote : dans une marketplace qui démarre, l'offre est le côté rare, on ne la taxe pas.

---

## Structure

```
app/
  page.tsx                 accueil
  browse/                  recherche + filtres
  l/[id]/                  détail annonce + formulaire de réservation
  u/[id]/                  profil public
  new/, new/[id]/          publication en 2 étapes
  my/listings, my/bookings
  booking/[id]/            page centrale d'une réservation
  messages/, messages/[threadId]/
  settings/, admin/, onboarding/
  actions/                 server actions (auth, listings, bookings, messages, profile, admin, credentials)
  api/
    checkout/              création de la session Stripe
    webhooks/stripe/       webhook idempotent
    cron/expire-requests/  expiration 48 h + publication des avis
components/  ui/, listing/, booking/, messaging/
lib/         supabase/, payments/, validation/, pricing, format, constants
supabase/    migrations/0001_init, 0002_rls, 0003_functions + seed
types/       database.ts (types métier, à régénérer une fois le projet lié)
```

---

## Vérifications passées

- `npm run typecheck` : aucune erreur.
- `npm run build` : 24 routes compilées.
- Migrations rejouées sur PostgreSQL 16 avec tests fonctionnels : publication sans photo refusée, service en catégorie encadrée envoyé en revue puis approuvé par un admin, devis (objet 4 jours = ฿2 000, frais ฿99), réservation, acceptation, chevauchement refusé (`slot_taken`), remise par code, retour, avis publiés en double aveugle seulement une fois les deux écrits, vue `profile_stats` correcte, tâches cron.

---

## Reste à faire avant le pilote

- [ ] Confirmer le pays du compte Stripe (PromptPay) ou basculer sur Opn Payments
- [ ] Brancher un vrai OTP SMS (`app/actions/profile.ts` enregistre le numéro sans OTP au pilote)
- [ ] E-mails transactionnels (Resend) sur les transitions de réservation
- [ ] Faire relire les CGU et la page Confidentialité par un juriste
- [ ] i18n thaï (les chaînes sont en anglais en dur pour l'instant)
- [ ] Seed de 15 annonces réelles et recrutement des 20 premiers fournisseurs

---

## Documents de référence

La synthèse du dossier d'origine (2021), l'étude de faisabilité et les specs produit et technique complètes sont dans le projet Claude « Borrow » :
`borrow-synthese-faisabilite.md`, `borrow-spec-produit-mvp.md`, `borrow-spec-technique.md`.
