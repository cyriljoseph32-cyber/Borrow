import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, photoUrl } from "@/lib/queries";
import { thb, dateRange, dateTime } from "@/lib/format";
import { Badge, Card, Empty } from "@/components/ui";
import type { BookingStatus } from "@/types/database";

/** "due tomorrow" / "out 4 days" pill for an active item, à la wireframe. */
function dueLabel(b: Pick<Row, "status" | "kind" | "ends_at">): string | null {
  if (b.status !== "in_progress" || b.kind !== "item") return null;
  const days = differenceInCalendarDays(new Date(b.ends_at), new Date());
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `out ${days} days`;
}

export const metadata = { title: "My bookings" };

const TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  requested: "warning",
  accepted: "info",
  in_progress: "info",
  completed: "success",
  disputed: "danger",
};

type Row = {
  id: string;
  status: BookingStatus;
  kind: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  price_amount: number;
  service_fee_amount: number;
  payment_status: string;
  listings: { title: string; listing_photos: { storage_path: string; sort_order: number }[] } | null;
};

function BookingRow({ b }: { b: Row }) {
  const cover = photoUrl(
    b.listings?.listing_photos?.slice().sort((x, y) => x.sort_order - y.sort_order)[0]?.storage_path,
  );
  const due = dueLabel(b);

  return (
    <Link
      href={`/booking/${b.id}`}
      className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 transition hover:shadow-[0_4px_14px_rgba(60,30,10,0.08)]"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-14 w-14 rounded-xl object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-xl bg-navy-50" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-900">
          {b.listings?.title ?? "Listing"}
        </p>
        <p className="text-xs text-navy-400">
          {b.kind === "item"
            ? dateRange(b.starts_at, b.ends_at)
            : `${dateTime(b.starts_at)} · ${b.quantity}p`}
        </p>
      </div>

      <div className="text-right">
        <Badge tone={due ? "warning" : (TONE[b.status] ?? "neutral")}>
          {due ?? b.status.replace(/_/g, " ")}
        </Badge>
        <p className="mt-1 text-xs text-navy-400">{thb(b.price_amount)}</p>
      </div>
    </Link>
  );
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/my/bookings");

  const asOwner = tab === "lending";
  const supabase = await createClient();

  const { data } = await supabase
    .from("bookings")
    .select(
      "id,status,kind,starts_at,ends_at,quantity,price_amount,service_fee_amount,payment_status,listings(title,listing_photos(storage_path,sort_order))",
    )
    .eq(asOwner ? "owner_id" : "renter_id", profile.id)
    .order("starts_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl text-navy-900">Items</h1>

      <div className="flex gap-2">
        <Link
          href="/my/bookings"
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            !asOwner ? "bg-terracotta text-sand" : "border border-navy-200 bg-white text-navy-700"
          }`}
        >
          📥 Borrowed
        </Link>
        <Link
          href="/my/bookings?tab=lending"
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            asOwner ? "bg-terracotta text-sand" : "border border-navy-200 bg-white text-navy-700"
          }`}
        >
          🔧 Lent out
        </Link>
        <Link
          href="/new"
          className="ml-auto rounded-full border-2 border-dashed border-navy-200 px-3 py-1.5 text-sm font-semibold text-navy-700 hover:border-terracotta hover:text-terracotta-dark"
        >
          + List something
        </Link>
      </div>

      {rows.length ? (
        <div className="space-y-2">
          {rows.map((b) => (
            <BookingRow key={b.id} b={b} />
          ))}
        </div>
      ) : (
        <Empty
          title={asOwner ? "No one has booked from you yet" : "You haven't booked anything yet"}
          hint={asOwner ? "Publish a listing and it will show up here." : "Browse what's available on the island."}
        />
      )}

      <Card className="text-sm text-navy-400">
        A request expires automatically if the owner does not answer within 48 hours.
      </Card>
    </div>
  );
}
