import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { PhotoManager } from "./photos";
import { AvailabilityManager } from "./availability";
import { PublishBox } from "./publish";
import { Card } from "@/components/ui";

export const metadata = { title: "Photos & availability" };

export default async function ListingStepTwo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await currentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_photos(id,storage_path,sort_order), availability(id,kind,starts_at,ends_at)")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  if (listing.owner_id !== profile.id) notFound();

  const photos = (listing.listing_photos ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">{listing.title}</h1>
        <p className="text-sm text-navy-400">Step 2 of 2 — photos, availability, publish.</p>
      </div>

      <Card>
        <h2 className="mb-1 font-medium text-navy-900">Photos</h2>
        <p className="mb-4 text-sm text-navy-400">
          At least one is required. The first one is the cover.
        </p>
        <PhotoManager listingId={listing.id} ownerId={profile.id} photos={photos} />
      </Card>

      <Card>
        <h2 className="mb-1 font-medium text-navy-900">
          {listing.kind === "item" ? "Blocked dates" : "Open slots"}
        </h2>
        <p className="mb-4 text-sm text-navy-400">
          {listing.kind === "item"
            ? "Your item is available by default. Block the dates you need it yourself."
            : "Your time is unavailable by default. Open the slots people can book."}
        </p>
        <AvailabilityManager
          listingId={listing.id}
          kind={listing.kind === "item" ? "blocked" : "open"}
          rows={listing.availability ?? []}
        />
      </Card>

      <PublishBox listingId={listing.id} status={listing.status} photoCount={photos.length} />
    </div>
  );
}
