import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { Avatar, Badge, Card, Empty } from "@/components/ui";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url,bio,area,languages,created_at")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const [{ data: stats }, { data: listings }, { data: reviews }, { data: credentials }] =
    await Promise.all([
      supabase.from("profile_stats").select("*").eq("profile_id", id).single(),
      supabase
        .from("listings")
        .select("id,title,area,kind,price_amount,price_unit,duration_minutes,listing_photos(storage_path)")
        .eq("owner_id", id)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("id,rating,comment,created_at,profiles!reviews_author_id_fkey(full_name)")
        .eq("subject_id", id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("credentials")
        .select("kind,issuer,verified_at")
        .eq("profile_id", id)
        .not("verified_at", "is", null),
    ]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={avatarUrl(profile.avatar_url)} name={profile.full_name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-navy-900">
              {profile.full_name || "Borrow member"}
            </h1>
            <p className="text-sm text-navy-400">
              {profile.area} · member since {shortDate(profile.created_at)}
            </p>
            <p className="mt-1 text-sm text-navy-700">
              {stats && stats.review_count > 0
                ? `★ ${stats.avg_rating} · ${stats.review_count} review(s) · ${
                    stats.completed_as_owner + stats.completed_as_renter
                  } completed booking(s)`
                : "No reviews yet"}
            </p>
            {profile.bio && <p className="mt-3 text-sm text-navy-700">{profile.bio}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {profile.languages?.map((l: string) => <Badge key={l}>{l}</Badge>)}
              {credentials?.map((c, i) => (
                <Badge key={i} tone="success">
                  ✓ {c.issuer ? `${c.issuer} ` : ""}
                  {c.kind.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-medium text-navy-900">Listings</h2>
        {listings?.length ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(listings as ListingCardData[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <Empty title="Nothing listed right now" />
        )}
      </section>

      {!!reviews?.length && (
        <section>
          <h2 className="mb-3 font-medium text-navy-900">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id}>
                <p className="text-sm">
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
        </section>
      )}
    </div>
  );
}
