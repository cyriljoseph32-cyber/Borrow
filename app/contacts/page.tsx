import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, avatarUrl } from "@/lib/queries";
import { fromNow } from "@/lib/format";
import { Avatar, Empty } from "@/components/ui";

export const metadata = { title: "Contacts" };

type ThreadRow = {
  id: string;
  last_message_at: string;
  owner_id: string;
  renter_id: string;
  listings: { title: string } | null;
  renter: { id: string; full_name: string; avatar_url: string | null } | null;
  owner: { id: string; full_name: string; avatar_url: string | null } | null;
};

export default async function ContactsPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/contacts");

  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select(
      `id,last_message_at,owner_id,renter_id,
       listings(title),
       renter:profiles!threads_renter_id_fkey(id,full_name,avatar_url),
       owner:profiles!threads_owner_id_fkey(id,full_name,avatar_url)`,
    )
    .or(`renter_id.eq.${profile.id},owner_id.eq.${profile.id}`)
    .order("last_message_at", { ascending: false });

  const rows = (threads ?? []) as unknown as ThreadRow[];

  // Un contact par personne : on garde son fil le plus récent et on liste les échanges partagés.
  const byContact = new Map<
    string,
    { person: { id: string; full_name: string; avatar_url: string | null }; threadId: string; last: string; listings: string[] }
  >();

  for (const t of rows) {
    const isOwner = t.owner_id === profile.id;
    const person = isOwner ? t.renter : t.owner;
    if (!person) continue;
    const title = t.listings?.title;
    const existing = byContact.get(person.id);
    if (existing) {
      if (title && !existing.listings.includes(title)) existing.listings.push(title);
    } else {
      byContact.set(person.id, {
        person,
        threadId: t.id,
        last: t.last_message_at,
        listings: title ? [title] : [],
      });
    }
  }

  const contacts = [...byContact.values()].sort(
    (a, b) => new Date(b.last).getTime() - new Date(a.last).getTime(),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl text-navy-900">Contacts</h1>

      {contacts.length ? (
        <div className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-100 bg-white">
          {contacts.map((c) => (
            <Link
              key={c.person.id}
              href={`/messages/${c.threadId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-navy-50"
            >
              <Avatar src={avatarUrl(c.person.avatar_url)} name={c.person.full_name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-900">
                  {c.person.full_name || "Borrow member"}
                </p>
                <p className="truncate text-xs text-navy-400">
                  {c.listings.length ? c.listings.join(" · ") : "No shared items yet"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-navy-400">{fromNow(c.last)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="No contacts yet"
          hint="People you borrow from or lend to will show up here once you message or book."
        />
      )}
    </div>
  );
}
