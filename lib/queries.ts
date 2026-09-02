import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export { photoUrl, avatarUrl } from "@/lib/photo";

/** Profil de l'utilisateur connecté, ou null. */
export async function currentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) throw new Error("not_authenticated");
  return profile;
}

/** Compte les messages non lus, pour la pastille du menu. */
export async function unreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select("id")
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`);
  if (!threads?.length) return 0;

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in(
      "thread_id",
      threads.map((t) => t.id),
    )
    .neq("sender_id", userId)
    .is("read_at", null);

  return count ?? 0;
}
