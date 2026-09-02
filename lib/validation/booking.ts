import { z } from "zod";

export const bookingRequestSchema = z
  .object({
    listing_id: z.string().uuid(),
    starts_at: z.string().min(1, "Pick a start"),
    ends_at: z.string().min(1, "Pick an end"),
    quantity: z.coerce.number().int().min(1).max(50).default(1),
    message: z.string().trim().max(1000).optional(),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    path: ["ends_at"],
    message: "The end must be after the start",
  });

export const reviewSchema = z.object({
  booking_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const disputeSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10, "Describe what happened").max(4000),
});

export const messageSchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Your name").max(80),
  bio: z.string().trim().max(1000).optional(),
  area: z.string().trim().max(60).optional(),
  languages: z.array(z.string()).max(6).default([]),
});
