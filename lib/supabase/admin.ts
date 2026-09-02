import { createClient } from "@supabase/supabase-js";


// Client non typé : supabase-js exige un schéma généré.
// Une fois le projet lié : npm run db:types, puis réintroduire le générique <Database>.
/**
 * Client à clé de service : contourne la RLS.
 * NE JAMAIS importer depuis un composant client.
 * Réservé au webhook Stripe et aux routes cron.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
