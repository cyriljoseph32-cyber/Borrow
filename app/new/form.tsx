"use client";

import { useActionState, useState } from "react";
import { createListing } from "@/app/actions/listings";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { AREAS } from "@/lib/constants";
import type { Category } from "@/types/database";

type Cat = Pick<Category, "id" | "name_en" | "parent_id" | "accepts" | "requires_review">;

export function NewListingForm({ categories }: { categories: Cat[] }) {
  const [kind, setKind] = useState<"item" | "service">("item");
  const [state, action, pending] = useActionState(createListing, null);

  const usable = categories.filter((c) => c.accepts.includes(kind));
  const needsReview = usable.some((c) => c.requires_review) && kind === "service";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">List something</h1>
      <p className="mb-6 text-sm text-navy-400">
        Step 1 of 2 — the basics. Photos and availability come next.
      </p>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      <form action={action}>
        <Card className="mb-4">
          <h2 className="mb-4 font-medium text-navy-900">What are you offering?</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["item", "service"] as const).map((k) => (
              <label
                key={k}
                className={`cursor-pointer rounded-lg border p-4 text-sm transition ${
                  kind === k
                    ? "border-navy-900 bg-navy-50"
                    : "border-navy-200 hover:border-navy-400"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <span className="block font-medium text-navy-900">
                  {k === "item" ? "An item to rent" : "A service to book"}
                </span>
                <span className="mt-1 block text-xs text-navy-400">
                  {k === "item"
                    ? "Gear that sits unused — priced per day, with a deposit."
                    : "Your time and skill — priced per session, booked on a slot."}
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="mb-4">
          <h2 className="mb-4 font-medium text-navy-900">Describe it</h2>

          <Field label="Category">
            <Select name="category_id" required>
              <option value="">Pick a category…</option>
              {usable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? `— ${c.name_en}` : c.name_en}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title">
            <Input
              name="title"
              required
              maxLength={120}
              placeholder={
                kind === "item" ? "Scubapro regulator, serviced 2026" : "Guided fun dive at Sail Rock"
              }
            />
          </Field>

          <Field label="Description">
            <Textarea
              name="description"
              rows={5}
              placeholder={
                kind === "item"
                  ? "Condition, what's included, anything the borrower should know."
                  : "What happens during the session, what's included, level required."
              }
            />
          </Field>

          <Field label="Area">
            <Select name="area" required>
              <option value="">Where is it?</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>

          {kind === "item" && (
            <Field label="Condition notes" hint="Scratches, quirks, anything worth flagging.">
              <Input name="condition_notes" maxLength={1000} />
            </Field>
          )}
        </Card>

        <Card className="mb-4">
          <h2 className="mb-4 font-medium text-navy-900">Price</h2>

          <Field label={kind === "item" ? "Price per day (฿)" : "Price per session (฿)"}>
            <Input name="price_baht" type="number" min={1} step={1} required />
          </Field>

          {kind === "item" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Weekly price (฿)" hint="Optional — cheaper for long rentals.">
                  <Input name="price_week_baht" type="number" min={1} step={1} />
                </Field>
                <Field label="Monthly price (฿)" hint="Optional.">
                  <Input name="price_month_baht" type="number" min={1} step={1} />
                </Field>
              </div>
              <Field
                label="Deposit (฿)"
                hint="Exchanged directly between you and the borrower at handover. Borrow does not hold it."
              >
                <Input name="deposit_baht" type="number" min={0} step={1} defaultValue={0} />
              </Field>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duration (minutes)">
                <Input
                  name="duration_minutes"
                  type="number"
                  min={15}
                  max={1440}
                  step={15}
                  defaultValue={180}
                  required
                />
              </Field>
              <Field label="Max participants">
                <Input name="capacity" type="number" min={1} max={50} defaultValue={1} required />
              </Field>
            </div>
          )}
        </Card>

        {needsReview && (
          <Alert tone="info">
            Services in regulated categories (diving, coaching) are reviewed by the Borrow team
            before going live. That review is what makes the badge worth something.
          </Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Continue to photos"}
        </Button>
      </form>
    </div>
  );
}
