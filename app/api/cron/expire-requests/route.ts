import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Appelée par Vercel Cron (voir vercel.json).
 * Expire les demandes sans réponse au bout de 48 h et publie les avis
 * dont la fenêtre de 14 jours est écoulée.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const [expired, published] = await Promise.all([
    supabase.rpc("expire_stale_requests"),
    supabase.rpc("publish_stale_reviews"),
  ]);

  return NextResponse.json({
    expired_requests: expired.data ?? 0,
    published_reviews: published.data ?? 0,
    errors: [expired.error?.message, published.error?.message].filter(Boolean),
  });
}
