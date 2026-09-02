import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { fromNow, shortDate } from "@/lib/format";
import { Badge, Card, Empty } from "@/components/ui";
import type { BookingStatus } from "@/types/database";

export const metadata = { title: "Home" };

type EventRow = {
  id: string;
  to_status: BookingStatus;
  created_at: string;
  booking: {
    id: string;
    owner_id: string;
    renter_id: string;
    listing: { title: string } | null;
    renter: { full_name: string } | null;
    owner: { full_name: string } | null;
  } | null;
};

type DueRow = {
  id: string;
  owner_id: string;
  renter_id: string;
  ends_at: string;
  listings: { title: string } | null;
};

function feedLine(e: EventRow, myId: string): { text: string; tag?: string } | null {
  const b = e.booking;
  if (!b) return null;
  const isOwner = b.owner_id === myId;
  const title = b.listing?.title ?? "the item";
  const renter = b.renter?.full_name || "Someone";
  const owner = b.owner?.full_name || "The owner";

  switch (e.to_status) {
    case "requested":
      return isOwner
        ? { text: `${renter} requested to borrow your ${title}`, tag: "new" }
        : { text: `You requested to borrow ${title} from ${owner}` };
    case "accepted":
      return isOwner
        ? { text: `You accepted ${renter}'s request for ${title}` }
        : { text: `${owner} accepted your request for ${title}` };
    case "declined":
      return isOwner
        ? { text: `You declined ${renter}'s request for ${title}` }
        : { text: `${owner} declined your request for ${title}` };
    case "expired":
      return isOwner
        ? { text: `${renter}'s request for ${title} expired` }
        : { text: `Your request for ${title} expired` };
    case "cancelled_by_renter":
      return isOwner
        ? { text: `${renter} cancelled their request for ${title}` }
        : { text: `You cancelled your request for ${title}` };
    case "cancelled_by_owner":
      return isOwner
        ? { text: `You cancelled ${renter}'s request for ${title}` }
        : { text: `${owner} cancelled your booking for ${title}` };
    case "in_progress":
      return isOwner
        ? { text: `You handed ${title} to ${renter}` }
        : { text: `You picked up ${title} from ${owner}` };
    case "completed":
      return isOwner
        ? { text: `${renter} returned ${title} ✓` }
        : { text: `You returned ${title} to ${owner} ✓` };
    case "disputed":
      return { text: `A dispute was opened on ${title}` };
    default:
      return null;
  }
}

function dueText(days: number): string {
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}

export default async function HomeFeedPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/home");

  const supabase = await createClient();

  const [{ data: events }, { data: due }] = await Promise.all([
    supabase
      .from("booking_events")
      .select(
        `id,to_status,created_at,
         booking:bookings!inner(
           id,owner_id,renter_id,
           listing:listings(title),
           renter:profiles!bookings_renter_id_fkey(full_name),
           owner:profiles!bookings_owner_id_fkey(full_name)
         )`,
      )
      .or(`owner_id.eq.${profile.id},renter_id.eq.${profile.id}`, { foreignTable: "bookings" })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("bookings")
      .select("id,owner_id,renter_id,ends_at,listings(title)")
      .eq("status", "in_progress")
      .or(`owner_id.eq.${profile.id},renter_id.eq.${profile.id}`)
      .lte("ends_at", new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
      .order("ends_at", { ascending: true }),
  ]);

  const feedItems = ((events ?? []) as unknown as EventRow[])
    .map((e) => ({ e, line: feedLine(e, profile.id) }))
    .filter((x): x is { e: EventRow; line: { text: string; tag?: string } } => !!x.line);

  const dueItems = (due ?? []) as unknown as DueRow[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl text-navy-900">Hey {profile.full_name?.split(" ")[0] || "there"} 👋</h1>

      {!!dueItems.length && (
        <div className="space-y-2">
          {dueItems.map((d) => {
            const days = differenceInCalendarDays(new Date(d.ends_at), new Date());
            return (
              <Link
                key={d.id}
                href={`/booking/${d.id}`}
                className="flex items-center justify-between rounded-2xl border-2 border-dashed border-honey bg-honey-pale px-4 py-3 text-sm hover:bg-honey-light"
              >
                <span className="font-medium text-terracotta-dark">
                  Reminder — {(d.listings as unknown as { title: string } | null)?.title ?? "an item"} is{" "}
                  {dueText(days)}
                </span>
                <Badge tone="warning">{dueText(days)}</Badge>
              </Link>
            );
          })}
        </div>
      )}

      {feedItems.length ? (
        <div className="space-y-2">
          {feedItems.map(({ e, line }) => (
            <Link
              key={e.id}
              href={`/booking/${e.booking!.id}`}
              className="flex items-start justify-between gap-3 rounded-2xl border border-navy-100 bg-white p-4 transition hover:shadow-[0_4px_14px_rgba(60,30,10,0.08)]"
            >
              <p className="text-sm text-navy-900">
                {line.tag && <Badge tone="info" className="mr-2">{line.tag}</Badge>}
                {line.text}
              </p>
              <span className="shrink-0 text-xs text-navy-400">{fromNow(e.created_at)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Nothing here yet"
          hint="Requests, handovers and returns will show up here as they happen."
        />
      )}

      <Card className="text-sm text-navy-400">
        Looking for something?{" "}
        <Link href="/browse" className="font-medium text-terracotta-dark hover:underline">
          Browse what&apos;s nearby →
        </Link>{" "}
        · Last check-in {shortDate(new Date())}.
      </Card>
    </div>
  );
}
