"use client";

import { createBrowserClient } from "@supabase/ssr";


// Client non typé : supabase-js exige un schéma généré.
// Une fois le projet lié : npm run db:types, puis réintroduire le générique <Database>.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
