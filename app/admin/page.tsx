import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { shortDate, dateTime } from "@/lib/format";
import { Badge, Card, Empty } from "@/components/ui";
import { AdminRowActions, CredentialActions, DisputeActions } from "./actions-ui";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/");

  const supabase = await createClient();

  const [{ data: pending }, { data: creds }, { data: disputes }, { data: reports }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id,title,kind,area,created_at,profiles!listings_owner_id_fkey(full_name)")
        .eq("status", "pending_review")
        .order("created_at"),
      supabase
        .from("credentials")
        .select("id,kind,issuer,reference,created_at,profiles!credentials_profile_id_fkey(id,full_name)")
        .is("verified_at", null)
        .order("created_at"),
      supabase
        .from("disputes")
        .select("id,reason,description,created_at,booking_id,status")
        .eq("status", "open")
        .order("created_at"),
      supabase
        .from("reports")
        .select("id,reason,created_at,listing_id,profile_id")
        .is("handled_at", null)
        .order("created_at"),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy-900">Admin</h1>

      <section>
        <h2 className="mb-3 font-medium text-navy-900">
          Services awaiting review ({pending?.length ?? 0})
        </h2>
        {pending?.length ? (
          <div className="space-y-2">
            {pending.map((l) => (
              <Card key={l.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/l/${l.id}`} className="text-sm font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-xs text-navy-400">
                    {(l.profiles as unknown as { full_name: string })?.full_name} · {l.area} ·{" "}
                    {shortDate(l.created_at)}
                  </p>
                </div>
                <AdminRowActions listingId={l.id} />
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="Nothing waiting" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-navy-900">
          Certifications to verify ({creds?.length ?? 0})
        </h2>
        {creds?.length ? (
          <div className="space-y-2">
            {creds.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-navy-900">
                    {c.issuer ? `${c.issuer} · ` : ""}
                    {c.kind.replace("_", " ")}
                    {c.reference ? ` · ${c.reference}` : ""}
                  </p>
                  <p className="text-xs text-navy-400">
                    <Link
                      href={`/u/${(c.profiles as unknown as { id: string })?.id}`}
                      className="hover:underline"
                    >
                      {(c.profiles as unknown as { full_name: string })?.full_name}
                    </Link>{" "}
                    · {shortDate(c.created_at)}
                  </p>
                </div>
                <CredentialActions credentialId={c.id} />
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="Nothing to verify" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-navy-900">Open disputes ({disputes?.length ?? 0})</h2>
        {disputes?.length ? (
          <div className="space-y-2">
            {disputes.map((d) => (
              <Card key={d.id}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="danger">{d.reason}</Badge>
                  <Link href={`/booking/${d.booking_id}`} className="text-xs underline">
                    see booking
                  </Link>
                  <span className="ml-auto text-xs text-navy-400">{dateTime(d.created_at)}</span>
                </div>
                <p className="mb-3 text-sm text-navy-700">{d.description}</p>
                <DisputeActions disputeId={d.id} />
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No open disputes" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-navy-900">Reports ({reports?.length ?? 0})</h2>
        {reports?.length ? (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id} className="text-sm">
                <p className="text-navy-900">{r.reason}</p>
                <p className="text-xs text-navy-400">{dateTime(r.created_at)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title="No reports" />
        )}
      </section>
    </div>
  );
}
