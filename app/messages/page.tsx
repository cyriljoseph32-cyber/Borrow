import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, avatarUrl } from "@/lib/queries";
import { fromNow } from "@/lib/format";
import { Avatar, Empty } from "@/components/ui";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/messages");

  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select(
      `id,last_message_at,listing_id,renter_id,owner_id,
       listings(title),
       renter:profiles!threads_renter_id_fkey(id,full_name,avatar_url),
       owner:profiles!threads_owner_id_fkey(id,full_name,avatar_url)`,
    )
    .or(`renter_id.eq.${profile.id},owner_id.eq.${profile.id}`)
    .order("last_message_at", { ascending: false });

  if (!threads?.length) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold text-navy-900">Messages</h1>
        <Empty title="No conversations yet" hint="They start when you request a booking." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-navy-900">Messages</h1>

      <div className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {threads.map((t) => {
          const isOwner = t.owner_id === profile.id;
          const other = (isOwner ? t.renter : t.owner) as unknown as {
            id: string;
            full_name: string;
            avatar_url: string | null;
          };
          return (
            <Link
              key={t.id}
              href={`/messages/${t.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-navy-50"
            >
              <Avatar src={avatarUrl(other?.avatar_url)} name={other?.full_name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-900">
                  {other?.full_name || "Borrow member"}
                </p>
                <p className="truncate text-xs text-navy-400">
                  {(t.listings as unknown as { title: string })?.title}
                </p>
              </div>
              <span className="text-xs text-navy-400">{fromNow(t.last_message_at)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
