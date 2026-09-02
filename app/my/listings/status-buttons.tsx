"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setListingStatus } from "@/app/actions/listings";
import { Button } from "@/components/ui";
import type { ListingStatus } from "@/types/database";

export function ListingStatusButtons({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Link href={`/new/${listingId}`}>
          <Button size="sm" variant="secondary">
            Finish
          </Button>
        </Link>
      )}
      {status === "published" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(() => void setListingStatus(listingId, "paused"))}
        >
          Pause
        </Button>
      )}
      {status === "paused" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(() => void setListingStatus(listingId, "published"))}
        >
          Resume
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(() => void setListingStatus(listingId, "archived"))}
        >
          Archive
        </Button>
      )}
    </div>
  );
}
