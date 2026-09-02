import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, photoUrl } from "@/lib/queries";
import { thb } from "@/lib/format";
import { unitLabel } from "@/lib/pricing";
import { Badge, Button, Empty } from "@/components/ui";
import { ListingStatusButtons } from "./status-buttons";
import type { Listing } from "@/types/database";

export const metadata = { title: "My listings" };

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  pending_review: "warning",
  published: "success",
  paused: "neutral",
  archived: "neutral",
};

export default async function MyListingsPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/my/listings");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*, listing_photos(storage_path,sort_order)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as unknown as (Listing & {
    listing_photos: { storage_path: string; sort_order: number }[];
  })[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-900">My listings</h1>
        <Link href="/new">
          <Button size="sm">List something</Button>
        </Link>
      </div>

      {listings.length ? (
        <div className="space-y-2">
          {listings.map((l) => {
            const cover = photoUrl(
              l.listing_photos?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path,
            );
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-100 bg-white p-3"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-navy-50" />
                )}

                <div className="min-w-0 flex-1">
                  <Link href={`/l/${l.id}`} className="text-sm font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-xs text-navy-400">
                    {thb(l.price_amount)} {unitLabel(l.kind, l.price_unit)} · {l.view_count} views
                  </p>
                </div>

                <Badge tone={TONE[l.status] ?? "neutral"}>{l.status.replace(/_/g, " ")}</Badge>
                <ListingStatusButtons listingId={l.id} status={l.status} />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty title="Nothing listed yet" hint="Your first listing takes about two minutes." />
      )}
    </div>
  );
}
