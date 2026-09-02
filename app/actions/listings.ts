"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, availabilitySchema } from "@/lib/validation/listing";
import { humanError } from "@/lib/constants";

const baht = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : Math.round(Number(v) * 100);

export async function createListing(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const kind = String(formData.get("kind") || "item") as "item" | "service";

  const parsed = listingSchema.safeParse({
    kind,
    category_id: formData.get("category_id"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    area: formData.get("area"),
    price_baht: formData.get("price_baht"),
    price_week_baht: formData.get("price_week_baht") || null,
    price_month_baht: formData.get("price_month_baht") || null,
    deposit_baht: formData.get("deposit_baht") || 0,
    condition_notes: formData.get("condition_notes") || null,
    duration_minutes: formData.get("duration_minutes") || null,
    capacity: formData.get("capacity") || 1,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;

  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      kind: v.kind,
      category_id: v.category_id,
      title: v.title,
      description: v.description,
      area: v.area,
      price_amount: Math.round(v.price_baht * 100),
      price_unit: v.kind === "item" ? "day" : "session",
      price_week_amount: v.kind === "item" ? baht(formData.get("price_week_baht")) : null,
      price_month_amount: v.kind === "item" ? baht(formData.get("price_month_baht")) : null,
      deposit_amount: v.kind === "item" ? Math.round(v.deposit_baht * 100) : 0,
      condition_notes: v.kind === "item" ? (v.condition_notes ?? null) : null,
      duration_minutes: v.kind === "service" ? (v.duration_minutes ?? null) : null,
      capacity: v.kind === "service" ? v.capacity : 1,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { error: humanError(error.message) };
  redirect(`/new/${data.id}`);
}

export async function attachPhoto(listingId: string, storagePath: string, sortOrder: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_photos")
    .insert({ listing_id: listingId, storage_path: storagePath, sort_order: sortOrder });
  if (error) return { error: humanError(error.message) };

  revalidatePath(`/new/${listingId}`);
  return { ok: true as const };
}

export async function removePhoto(photoId: string, listingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("listing_photos").delete().eq("id", photoId);
  if (error) return { error: humanError(error.message) };

  revalidatePath(`/new/${listingId}`);
  return { ok: true as const };
}

export async function addAvailability(_prev: unknown, formData: FormData) {
  const supabase = await createClient();

  const parsed = availabilitySchema.safeParse({
    listing_id: formData.get("listing_id"),
    kind: formData.get("kind"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the dates." };

  const { error } = await supabase.from("availability").insert({
    listing_id: parsed.data.listing_id,
    kind: parsed.data.kind,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
  });
  if (error) return { error: humanError(error.message) };

  revalidatePath(`/new/${parsed.data.listing_id}`);
  revalidatePath(`/l/${parsed.data.listing_id}`);
  return { ok: true as const };
}

export async function removeAvailability(id: string, listingId: string) {
  const supabase = await createClient();
  await supabase.from("availability").delete().eq("id", id);
  revalidatePath(`/new/${listingId}`);
  return { ok: true as const };
}

export async function publishListing(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const listingId = String(formData.get("listing_id"));

  const { data, error } = await supabase.rpc("publish_listing", { p_listing_id: listingId });
  if (error) return { error: humanError(error.message) };

  revalidatePath("/my/listings");
  return { ok: true as const, status: data?.status ?? "published" };
}

export async function setListingStatus(listingId: string, status: "published" | "paused" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) return { error: humanError(error.message) };

  revalidatePath("/my/listings");
  return { ok: true as const };
}
