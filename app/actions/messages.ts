"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validation/booking";
import { humanError } from "@/lib/constants";

export async function sendMessage(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const parsed = messageSchema.safeParse({
    thread_id: formData.get("thread_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Write something." };

  const { error } = await supabase.from("messages").insert({
    thread_id: parsed.data.thread_id,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: humanError(error.message) };

  revalidatePath(`/messages/${parsed.data.thread_id}`);
  return { ok: true as const };
}

export async function markThreadRead(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .is("read_at", null);
}
