"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { attachPhoto, removePhoto } from "@/app/actions/listings";
import { photoUrl } from "@/lib/photo";
import { Alert, Button } from "@/components/ui";

type Photo = { id: string; storage_path: string; sort_order: number };

export function PhotoManager({
  listingId,
  ownerId,
  photos,
}: {
  listingId: string;
  ownerId: string;
  photos: Photo[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    let order = photos.length;

    for (const file of Array.from(files).slice(0, 8 - photos.length)) {
      if (file.size > 8 * 1024 * 1024) {
        setError(`${file.name} is over 8 MB.`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${ownerId}/${listingId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) {
        setError(upErr.message);
        continue;
      }

      const res = await attachPhoto(listingId, path, order++);
      if (res && "error" in res && res.error) setError(res.error);
    }

    setBusy(false);
  }

  return (
    <div>
      {error && <Alert tone="error">{error}</Alert>}

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-navy-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(p.storage_path) ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-terracotta/90 px-1.5 py-0.5 text-[10px] text-sand">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => startTransition(() => void removePhoto(p.id, listingId))}
              className="absolute right-1 top-1 rounded bg-brick px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="inline-block">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy || photos.length >= 8}
          onChange={(e) => void upload(e.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || photos.length >= 8}
          onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}
        >
          {busy ? "Uploading…" : photos.length >= 8 ? "Maximum 8 photos" : "Add photos"}
        </Button>
      </label>
    </div>
  );
}
