"use client";

import { useActionState } from "react";
import Link from "next/link";
import { publishListing } from "@/app/actions/listings";
import { Alert, Button, Card } from "@/components/ui";

export function PublishBox({
  listingId,
  status,
  photoCount,
}: {
  listingId: string;
  status: string;
  photoCount: number;
}) {
  const [state, action, pending] = useActionState(publishListing, null);
  const published = state && "ok" in state && state.ok;

  return (
    <Card>
      <h2 className="mb-1 font-medium text-navy-900">Publish</h2>
      <p className="mb-4 text-sm text-navy-400">
        You can pause or edit it any time from your listings.
      </p>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      {published && (
        <Alert tone="success">
          {state.status === "pending_review"
            ? "Sent for review — regulated services are checked by the Borrow team before going live."
            : "Live. "}
          <Link href="/my/listings" className="underline">
            See your listings
          </Link>
        </Alert>
      )}

      {status === "pending_review" && !published && (
        <Alert tone="info">Waiting for review by the Borrow team.</Alert>
      )}

      <form action={action}>
        <input type="hidden" name="listing_id" value={listingId} />
        <Button type="submit" disabled={pending || photoCount === 0}>
          {photoCount === 0 ? "Add a photo first" : pending ? "Publishing…" : "Publish listing"}
        </Button>
      </form>
    </Card>
  );
}
