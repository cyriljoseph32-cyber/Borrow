"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { humanError } from "@/lib/constants";

export async function addCredential(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const kind = String(formData.get("kind") || "").trim();
  if (!kind) return { error: "Pick a type." };

  const { error } = await supabase.from("credentials").insert({
    profile_id: user.id,
    kind,
    issuer: String(formData.get("issuer") || "") || null,
    reference: String(formData.get("reference") || "") || null,
    expires_on: String(formData.get("expires_on") || "") || null,
  });

  if (error) return { error: humanError(error.message) };

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function verifyCredential(credentialId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase
    .from("credentials")
    .update({ verified_at: new Date().toISOString(), verified_by: user.id })
    .eq("id", credentialId);

  if (error) return { error: humanError(error.message) };

  revalidatePath("/admin");
  return { ok: true as const };
}
