import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { Button, Card } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";

export default async function HomePage() {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: listings } = await supabase
    .from("listings")
    .select("id,title,area,kind,price_amount,price_unit,duration_minutes,listing_photos(storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: categories } = await supabase
    .from("categories")
    .select("id,slug,name_en,name_th")
    .is("parent_id", null)
    .order("sort_order");

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-terracotta px-6 py-12 text-sand sm:px-12 sm:py-16">
        <p className="mb-3 text-sm uppercase tracking-widest text-sand/60">{t(locale, "home.kicker")}</p>
        <h1 className="max-w-2xl text-3xl leading-tight sm:text-5xl">
          {t(locale, "home.h1a")}
          <br />
          {t(locale, "home.h1b")}
        </h1>
        <p className="mt-4 max-w-xl text-sand/80">{t(locale, "home.sub")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/browse">
            <Button className="bg-sand text-terracotta-dark hover:bg-sand-dark">
              {t(locale, "home.browseBtn")}
            </Button>
          </Link>
          <Link href="/new">
            <Button
              variant="secondary"
              className="border-2 border-sand/30 bg-transparent text-sand hover:bg-white/10"
            >
              {t(locale, "home.listBtn")}
            </Button>
          </Link>
        </div>
      </section>

      {!!categories?.length && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-navy-900">{t(locale, "home.categories")}</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/browse?category=${c.id}`}
                className="rounded-full border border-navy-200 bg-white px-4 py-2 text-sm text-navy-700 hover:border-navy-600"
              >
                {locale === "th" && c.name_th ? c.name_th : c.name_en}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">{t(locale, "home.latest")}</h2>
          <Link href="/browse" className="text-sm text-navy-700 hover:text-navy-900">
            {t(locale, "home.seeAll")}
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
            {t(locale, "home.empty")}{" "}
            <Link href="/new" className="underline">
              {t(locale, "home.emptyLink")}
            </Link>
            .
          </Card>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: t(locale, "home.step1t"), d: t(locale, "home.step1d") },
          { title: t(locale, "home.step2t"), d: t(locale, "home.step2d") },
          { title: t(locale, "home.step3t"), d: t(locale, "home.step3d") },
        ].map((s) => (
          <Card key={s.title}>
            <h3 className="mb-1 font-medium text-navy-900">{s.title}</h3>
            <p className="text-sm text-navy-700">{s.d}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
