import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { markThreadRead } from "@/app/actions/messages";
import { Conversation } from "./conversation";

export const metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const profile = await currentProfile();
  if (!profile) redirect(`/login?next=/messages/${threadId}`);

  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("threads")
    .select(
      `id,listing_id,renter_id,owner_id,booking_id,
       listings(title),
       renter:profiles!threads_renter_id_fkey(id,full_name),
       owner:profiles!threads_owner_id_fkey(id,full_name)`,
    )
    .eq("id", threadId)
    .single();

  if (!thread) notFound();
  if (thread.renter_id !== profile.id && thread.owner_id !== profile.id) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id,sender_id,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);

  await markThreadRead(threadId);

  const isOwner = thread.owner_id === profile.id;
  const other = (isOwner ? thread.renter : thread.owner) as unknown as { full_name: string };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/messages" className="text-sm text-navy-400 hover:text-navy-700">
          ← All conversations
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-navy-900">
          {other?.full_name || "Borrow member"}
        </h1>
        <p className="text-sm text-navy-400">
          <Link href={`/l/${thread.listing_id}`} className="hover:underline">
            {(thread.listings as unknown as { title: string })?.title}
          </Link>
          {thread.booking_id && (
            <>
              {" · "}
              <Link href={`/booking/${thread.booking_id}`} className="hover:underline">
                see the booking
              </Link>
            </>
          )}
        </p>
      </div>

      <Conversation
        threadId={threadId}
        userId={profile.id}
        initial={messages ?? []}
      />
    </div>
  );
}
