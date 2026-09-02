import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { Button, Card } from "@/components/ui";


export default async function HomePage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("id,title,area,kind,price_amount,price_unit,duration_minutes,listing_photos(storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: categories } = await supabase
    .from("categories")
    .select("id,slug,name_en")
    .is("parent_id", null)
    .order("sort_order");

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-navy-900 px-6 py-12 text-sand sm:px-12 sm:py-16">
        <p className="mb-3 text-sm uppercase tracking-widest text-sand/60">Koh Samui</p>
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
          Don&apos;t buy. Don&apos;t store.
          <br />
          Borrow the gear — and the person who knows it.
        </h1>
        <p className="mt-4 max-w-xl text-sand/80">
          Dive gear, underwater cameras, paddleboards, training kit. Rent from people around
          you, or book a session with the instructor who owns it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/browse">
            <Button className="bg-sand text-navy-900 hover:bg-sand-dark">Browse listings</Button>
          </Link>
          <Link href="/new">
            <Button variant="secondary" className="border-sand/30 bg-transparent text-sand hover:bg-white/10">
              List your gear
            </Button>
          </Link>
        </div>
      </section>

      {!!categories?.length && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-navy-900">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/browse?category=${c.id}`}
                className="rounded-full border border-navy-200 bg-white px-4 py-2 text-sm text-navy-700 hover:border-navy-600"
              >
                {c.name_en}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Latest listings</h2>
          <Link href="/browse" className="text-sm text-navy-700 hover:text-navy-900">
            See all →
          </Link>
        </div>

        {listings?.length ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(listings as ListingCardData[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <Card className="text-sm text-navy-400">
            Nothing published yet. Be the first — <Link href="/new" className="underline">list something</Link>.
          </Card>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "1. Find it nearby", d: "Search by category, area and dates. Everything is on the island." },
          { t: "2. Book and meet", d: "Send a request. Once accepted, pay the small Borrow fee and get your handover code." },
          { t: "3. Hand over, come back", d: "Photos before and after, deposit between you two, reviews at the end." },
        ].map((s) => (
          <Card key={s.t}>
            <h3 className="mb-1 font-medium text-navy-900">{s.t}</h3>
            <p className="text-sm text-navy-700">{s.d}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
