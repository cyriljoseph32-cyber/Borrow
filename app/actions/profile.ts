"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/booking";
import { humanError } from "@/lib/constants";

export async function saveProfile(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    bio: formData.get("bio") || undefined,
    area: formData.get("area") || undefined,
    languages: formData.getAll("languages").map(String),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: humanError(error.message) };

  revalidatePath("/settings");
  return { ok: true as const };
}

/**
 * Vérification du téléphone.
 *
 * Au pilote, l'OTP SMS n'est pas branché (coût et délai de mise en place d'un
 * expéditeur en Thaïlande). On enregistre le numéro et on marque le profil
 * comme vérifié après confirmation manuelle. Pour activer le vrai OTP :
 * supabase.auth.updateUser({ phone }) puis verifyOtp({ type: "phone_change" }).
 */
export async function savePhone(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const phone = String(formData.get("phone") || "").trim();
  if (!/^\+?[0-9 ]{8,20}$/.test(phone)) {
    return { error: "Enter a valid phone number, e.g. +66 63 375 3316." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone, phone_verified: true })
    .eq("id", user.id);

  if (error) return { error: humanError(error.message) };

  revalidatePath("/settings");
  return { ok: true as const };
}
