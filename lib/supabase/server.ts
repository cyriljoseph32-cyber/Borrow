import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import { cookies } from "next/headers";


// Client non typé : supabase-js exige un schéma généré.
// Une fois le projet lié : npm run db:types, puis réintroduire le générique <Database>.
/**
 * Client Supabase pour Server Components et Server Actions.
 * Dans un Server Component, l'écriture de cookies échoue silencieusement :
 * c'est attendu, le middleware se charge de rafraîchir la session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // appelé depuis un Server Component : sans effet, c'est normal
          }
        },
      },
    },
  );
}
