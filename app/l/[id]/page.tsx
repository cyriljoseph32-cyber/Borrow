import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, photoUrl, avatarUrl } from "@/lib/queries";
import { thb, shortDate, dateTime } from "@/lib/format";
import { unitLabel } from "@/lib/pricing";
import { Avatar, Badge, Card } from "@/components/ui";
import { BookingForm } from "./booking-form";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("title,description").eq("id", id).single();
  return {
    title: data?.title ?? "Listing",
    description: data?.description?.slice(0, 160),
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const viewer = await currentProfile();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      `*,
       listing_photos(id,storage_path,sort_order),
       availability(id,kind,starts_at,ends_at),
       categories(name_en,requires_review),
       profiles!listings_owner_id_fkey(id,full_name,avatar_url,area,languages,bio)`,
    )
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const owner = listing.profiles as unknown as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    area: string | null;
    languages: string[];
    bio: string | null;
  };

  const [{ data: stats }, { data: credentials }, { data: reviews }] = await Promise.all([
    supabase.from("profile_stats").select("*").eq("profile_id", owner.id).single(),
    supabase
      .from("credentials")
      .select("kind,issuer,reference,verified_at")
      .eq("profile_id", owner.id)
      .not("verified_at", "is", null),
    supabase
      .from("reviews")
      .select("id,rating,comment,created_at,profiles!reviews_author_id_fkey(full_name)")
      .eq("subject_id", owner.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const photos = (listing.listing_photos ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
  );
  const slots = (listing.availability ?? []).filter(
    (a: { kind: string; ends_at: string }) =>
      a.kind === (listing.kind === "item" ? "blocked" : "open") &&
      new Date(a.ends_at) > new Date(),
  );

  const isOwner = viewer?.id === owner.id;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {photos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {photos.map((p: { id: string; storage_path: string }, i: number) => (
              <div
                key={p.id}
                className={`overflow-hidden rounded-xl bg-navy-50 ${i === 0 ? "sm:col-span-2" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(p.storage_path) ?? ""}
                  alt={listing.title}
                  className={`w-full object-cover ${i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={listing.kind === "service" ? "info" : "neutral"}>
              {listing.kind === "service" ? "Service" : "Item"}
            </Badge>
            <Badge>{(listing.categories as unknown as { name_en: string })?.name_en}</Badge>
            <span className="text-sm text-navy-400">{listing.area}</span>
            {listing.status !== "published" && (
              <Badge tone="warning">{listing.status.replace("_", " ")}</Badge>
            )}
          </div>

          <h1 className="text-2xl font-semibold text-navy-900">{listing.title}</h1>

          <p className="mt-2 text-lg text-navy-700">
            <span className="font-semibold">{thb(listing.price_amount)}</span>{" "}
            <span className="text-navy-400">{unitLabel(listing.kind, listing.price_unit)}</span>
            {listing.kind === "service" && listing.duration_minutes && (
              <span className="text-navy-400"> · {listing.duration_minutes} min</span>
            )}
          </p>

          {listing.description && (
            <p className="mt-4 whitespace-pre-line text-navy-700">{listing.description}</p>
          )}

          {listing.condition_notes && (
            <Card className="mt-4">
              <p className="text-sm font-medium text-navy-900">Condition</p>
              <p className="mt-1 text-sm text-navy-700">{listing.condition_notes}</p>
            </Card>
          )}
        </div>

        {slots.length > 0 && (
          <Card>
            <h2 className="mb-3 font-medium text-navy-900">
              {listing.kind === "item" ? "Unavailable dates" : "Open slots"}
            </h2>
            <ul className="space-y-1 text-sm text-navy-700">
              {slots.map((s: { id: string; starts_at: string; ends_at: string }) => (
                <li key={s.id}>
                  {listing.kind === "item"
                    ? `${shortDate(s.starts_at)} → ${shortDate(s.ends_at)}`
                    : `${dateTime(s.starts_at)} → ${dateTime(s.ends_at)}`}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <div className="flex items-start gap-3">
            <Avatar src={avatarUrl(owner.avatar_url)} name={owner.full_name} size={48} />
            <div className="min-w-0">
              <Link href={`/u/${owner.id}`} className="font-medium text-navy-900 hover:underline">
                {owner.full_name || "Borrow member"}
              </Link>
              <p className="text-sm text-navy-400">
                {owner.area}
                {stats && stats.review_count > 0
                  ? ` · ★ ${stats.avg_rating} (${stats.review_count})`
                  : " · No reviews yet"}
              </p>
              {owner.bio && <p className="mt-2 text-sm text-navy-700">{owner.bio}</p>}

              {!!credentials?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {credentials.map((c, i) => (
                    <Badge key={i} tone="success">
                      ✓ {c.issuer ? `${c.issuer} ` : ""}
                      {c.kind.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {!!reviews?.length && (
          <div>
            <h2 className="mb-3 font-medium text-navy-900">Reviews</h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <p className="text-sm text-navy-900">
                    {"★".repeat(r.rating)}
                    <span className="text-navy-200">{"★".repeat(5 - r.rating)}</span>
                    <span className="ml-2 text-navy-400">
                      {(r.profiles as unknown as { full_name: string })?.full_name} ·{" "}
                      {shortDate(r.created_at)}
                    </span>
                  </p>
                  {r.comment && <p className="mt-1 text-sm text-navy-700">{r.comment}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <BookingForm
          listing={{
            id: listing.id,
            kind: listing.kind,
            price_amount: listing.price_amount,
            price_week_amount: listing.price_week_amount,
            price_month_amount: listing.price_month_amount,
            deposit_amount: listing.deposit_amount,
            capacity: listing.capacity,
            duration_minutes: listing.duration_minutes,
            status: listing.status,
          }}
          slots={slots.map((s: { starts_at: string; ends_at: string }) => ({
            starts_at: s.starts_at,
            ends_at: s.ends_at,
          }))}
          canBook={!!viewer && !isOwner && viewer.phone_verified}
          isOwner={isOwner}
          signedIn={!!viewer}
          phoneVerified={!!viewer?.phone_verified}
        />
      </aside>
    </div>
  );
}
