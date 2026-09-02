import Link from "next/link";
import { photoUrl } from "@/lib/queries";
import { thb } from "@/lib/format";
import { unitLabel } from "@/lib/pricing";
import { Badge } from "@/components/ui";
import type { Listing } from "@/types/database";

export type ListingCardData = Pick<
  Listing,
  "id" | "title" | "area" | "kind" | "price_amount" | "price_unit" | "duration_minutes"
> & {
  listing_photos?: { storage_path: string }[] | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const cover = photoUrl(listing.listing_photos?.[0]?.storage_path);

  return (
    <Link
      href={`/l/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-navy-50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-navy-200">
            No photo
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone={listing.kind === "service" ? "info" : "neutral"}>
            {listing.kind === "service" ? "Service" : "Item"}
          </Badge>
          <span className="truncate text-xs text-navy-400">{listing.area}</span>
        </div>

        <h3 className="line-clamp-2 text-sm font-medium text-navy-900">{listing.title}</h3>

        <p className="mt-1 text-sm text-navy-700">
          <span className="font-semibold">{thb(listing.price_amount)}</span>{" "}
          <span className="text-navy-400">
            {unitLabel(listing.kind, listing.price_unit)}
            {listing.kind === "service" && listing.duration_minutes
              ? ` · ${listing.duration_minutes} min`
              : ""}
          </span>
        </p>
      </div>
    </Link>
  );
}
