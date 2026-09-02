"use client";

import { useState, useTransition } from "react";
import { approveListing, rejectListing, resolveDispute } from "@/app/actions/admin";
import { verifyCredential } from "@/app/actions/credentials";
import { Button, Input } from "@/components/ui";

export function AdminRowActions({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(() => void approveListing(listingId))}>
        Approve
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(() => void rejectListing(listingId))}
      >
        Send back
      </Button>
    </div>
  );
}

export function CredentialActions({ credentialId }: { credentialId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(() => void verifyCredential(credentialId))}>
      Mark verified
    </Button>
  );
}

export function DisputeActions({ disputeId }: { disputeId: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note"
        className="max-w-xs"
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(() => void resolveDispute(disputeId, "resolved_renter", note))}
      >
        For the renter
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(() => void resolveDispute(disputeId, "resolved_owner", note))}
      >
        For the owner
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(() => void resolveDispute(disputeId, "closed", note))}
      >
        Close
      </Button>
    </div>
  );
}
