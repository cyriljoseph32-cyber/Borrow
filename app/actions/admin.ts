"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { humanError } from "@/lib/constants";

async function assertAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin", {});
  if (error || !data) throw new Error("not_admin");
  return supabase;
}

export async function approveListing(listingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_listing", { p_listing_id: listingId });
  if (error) return { error: humanError(error.message) };

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function rejectListing(listingId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("listings").update({ status: "draft" }).eq("id", listingId);
  if (error) return { error: humanError(error.message) };

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function resolveDispute(
  disputeId: string,
  outcome: "resolved_renter" | "resolved_owner" | "closed",
  note: string,
) {
  const supabase = await assertAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("disputes")
    .update({
      status: outcome,
      resolution_note: note,
      resolved_by: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) return { error: humanError(error.message) };

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function setBanned(profileId: string, banned: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: banned })
    .eq("id", profileId);

  if (error) return { error: humanError(error.message) };

  revalidatePath("/admin");
  return { ok: true as const };
}
