"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveHandoverCheck } from "@/app/actions/bookings";
import { Alert, Button, Card, Field, Textarea } from "@/components/ui";
import { dateTime } from "@/lib/format";
import type { HandoverCheck } from "@/types/database";

export function HandoverPanel({
  bookingId,
  userId,
  status,
  checks,
}: {
  bookingId: string;
  userId: string;
  status: string;
  checks: HandoverCheck[];
}) {
  const phase: "pickup" | "return" = status === "accepted" ? "pickup" : "return";
  const mine = checks.find((c) => c.phase === phase && c.by_user_id === userId);

  const [state, action, pending] = useActionState(saveHandoverCheck, null);
  const [paths, setPaths] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();

    for (const file of Array.from(files).slice(0, 6)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${bookingId}/${phase}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("handover-photos").upload(path, file);
      if (error) setUploadError(error.message);
      else setPaths((p) => [...p, path]);
    }
    setUploading(false);
  }

  return (
    <Card>
      <h2 className="mb-1 font-medium text-navy-900">
        {phase === "pickup" ? "Handover check" : "Return check"}
      </h2>
      <p className="mb-4 text-sm text-navy-400">
        Photograph the item together, before and after. This is what settles a dispute later.
      </p>

      {checks.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm text-navy-700">
          {checks.map((c) => (
            <li key={c.id}>
              {c.phase === "pickup" ? "Pickup" : "Return"} · {c.photo_paths.length} photo(s) ·{" "}
              {c.condition_ok ? "condition OK" : "issue flagged"} · {dateTime(c.created_at)}
            </li>
          ))}
        </ul>
      )}

      {mine ? (
        <Alert tone="success">You already recorded your {phase} check.</Alert>
      ) : status === "completed" ? null : (
        <>
          {uploadError && <Alert tone="error">{uploadError}</Alert>}
          {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

          <label className="mb-3 inline-block">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => void upload(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}
            >
              {uploading ? "Uploading…" : `Add photos (${paths.length})`}
            </Button>
          </label>

          <form action={action}>
            <input type="hidden" name="booking_id" value={bookingId} />
            <input type="hidden" name="phase" value={phase} />
            {paths.map((p) => (
              <input key={p} type="hidden" name="photo_paths" value={p} />
            ))}

            <label className="mb-3 flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" name="condition_ok" defaultChecked />
              Condition is as described
            </label>

            <Field label="Notes" hint="Scratches, missing parts, anything worth recording.">
              <Textarea name="notes" rows={2} />
            </Field>

            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Record my check"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
