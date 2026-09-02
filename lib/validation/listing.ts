import { z } from "zod";
import { AREAS } from "@/lib/constants";

const baht = z.coerce.number().int().positive().max(500_000, "Max ฿500,000");

export const listingDraftSchema = z.object({
  kind: z.enum(["item", "service"]),
  category_id: z.string().uuid("Pick a category"),
  title: z.string().trim().min(3, "At least 3 characters").max(120),
  description: z.string().trim().max(4000).default(""),
  area: z.enum(AREAS),
  price_baht: baht,
  price_week_baht: baht.optional().nullable(),
  price_month_baht: baht.optional().nullable(),
  deposit_baht: z.coerce.number().int().min(0).max(500_000).default(0),
  condition_notes: z.string().trim().max(1000).optional().nullable(),
  duration_minutes: z.coerce.number().int().min(15).max(1440).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(50).default(1),
});

export type ListingDraft = z.infer<typeof listingDraftSchema>;

/** Règles croisées objet / service — miroir des CHECK constraints en base. */
export const listingSchema = listingDraftSchema.superRefine((value, ctx) => {
  if (value.kind === "service") {
    if (!value.duration_minutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["duration_minutes"],
        message: "A service needs a duration",
      });
    }
    if (value.deposit_baht > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deposit_baht"],
        message: "Services cannot ask for a deposit",
      });
    }
  }
  if (value.kind === "item" && value.duration_minutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["duration_minutes"],
      message: "An item has no fixed duration",
    });
  }
});

export const availabilitySchema = z
  .object({
    listing_id: z.string().uuid(),
    kind: z.enum(["blocked", "open"]),
    starts_at: z.string().min(1),
    ends_at: z.string().min(1),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    path: ["ends_at"],
    message: "The end must be after the start",
  });
