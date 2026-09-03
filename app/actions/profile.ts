"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/booking";
import { humanError } from "@/lib/constants";
import { sendOtp, checkOtp, twilioConfigured, SmsNotConfiguredError } from "@/lib/sms";

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
 * Vérification du téléphone — vrai OTP SMS via Twilio Verify (lib/sms.ts).
 *
 * Étape 1 : sendPhoneOtp enregistre le numéro (non vérifié) et envoie le code.
 * Étape 2 : verifyPhoneOtp vérifie le code et marque le profil comme vérifié.
 *
 * Si TWILIO_* n'est pas configuré (dev local, ou avant que les clés soient
 * ajoutées), on retombe sur l'ancien comportement : le numéro est enregistré
 * et marqué vérifié directement, pour ne pas bloquer le développement.
 */
function normalizePhone(raw: string) {
  const phone = raw.trim();
  if (!/^\+?[0-9 ]{8,20}$/.test(phone)) return null;
  return phone.replace(/\s+/g, "");
}

export async function sendPhoneOtp(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (!phone) return { error: "Enter a valid phone number, e.g. +66 63 375 3316." };

  if (!twilioConfigured()) {
    // Pas d'OTP configuré : on garde l'ancien comportement (pilote sans SMS).
    const { error } = await supabase
      .from("profiles")
      .update({ phone, phone_verified: true })
      .eq("id", user.id);
    if (error) return { error: humanError(error.message) };
    revalidatePath("/settings");
    revalidatePath("/onboarding");
    return { ok: true as const, verified: true as const };
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ phone, phone_verified: false })
    .eq("id", user.id);
  if (dbError) return { error: humanError(dbError.message) };

  try {
    const result = await sendOtp(phone);
    if (!result.ok) return { error: result.error };
  } catch (e) {
    if (e instanceof SmsNotConfiguredError) return { error: e.message };
    return { error: "Could not send the SMS. Try again in a minute." };
  }

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true as const, verified: false as const, phone };
}

export async function verifyPhoneOtp(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const phone = normalizePhone(String(formData.get("phone") || ""));
  const code = String(formData.get("code") || "").trim();
  if (!phone) return { error: "Missing phone number." };
  if (!/^[0-9]{4,8}$/.test(code)) return { error: "Enter the code you received by SMS." };

  const result = await checkOtp(phone, code);
  if (!result.ok) return { error: result.error };

  const { error } = await supabase
    .from("profiles")
    .update({ phone, phone_verified: true })
    .eq("id", user.id);
  if (error) return { error: humanError(error.message) };

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true as const };
}
