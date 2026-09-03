import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { Button, Empty, Input, Select } from "@/components/ui";
import { AREAS } from "@/lib/constants";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Browse" };

type Params = {
  q?: string;
  kind?: string;
  category?: string;
  area?: string;
  max?: string;
  sort?: string;
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,slug,name_en,name_th,parent_id")
    .order("sort_order");

  let query = supabase
    .from("listings")
    .select(
      "id,title,area,kind,price_amount,price_unit,duration_minutes,created_at,listing_photos(storage_path)",
    )
    .eq("status", "published");

  if (sp.kind === "item" || sp.kind === "service") query = query.eq("kind", sp.kind);
  if (sp.category) query = query.eq("category_id", sp.category);
  if (sp.area) query = query.eq("area", sp.area);
  if (sp.max) {
    const max = Number(sp.max);
    if (Number.isFinite(max) && max > 0) query = query.lte("price_amount", Math.round(max * 100));
  }
  if (sp.q) query = query.textSearch("search_tsv", sp.q, { type: "websearch", config: "simple" });

  query =
    sp.sort === "price_asc"
      ? query.order("price_amount", { ascending: true })
      : sp.sort === "price_desc"
        ? query.order("price_amount", { ascending: false })
        : query.order("created_at", { ascending: false });

  const { data: listings, error } = await query.limit(48);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy-900">Browse</h1>

      <form className="grid gap-3 rounded-xl border border-navy-100 bg-white p-4 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search gear or sessions…" />
        </div>

        <Select name="kind" defaultValue={sp.kind ?? ""}>
          <option value="">Items &amp; services</option>
          <option value="item">Items only</option>
          <option value="service">Services only</option>
        </Select>

        <Select name="category" defaultValue={sp.category ?? ""}>
          <option value="">All categories</option>
          {categories?.map((c) => {
            const name = locale === "th" && c.name_th ? c.name_th : c.name_en;
            return (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `— ${name}` : name}
              </option>
            );
          })}
        </Select>

        <Select name="area" defaultValue={sp.area ?? ""}>
          <option value="">Anywhere</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>

        <div className="flex gap-2">
          <Select name="sort" defaultValue={sp.sort ?? ""}>
            <option value="">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </Select>
          <Button type="submit">Go</Button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-brick">Search failed: {error.message}</p>
      )}

      {listings?.length ? (
        <>
          <p className="text-sm text-navy-400">{listings.length} result(s)</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(listings as ListingCardData[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </>
      ) : (
        <Empty
          title="Nothing matches yet"
          hint="Try removing a filter, or be the first to list something in this category."
        />
      )}

      <p className="text-sm text-navy-400">
        Got gear sitting in a cupboard?{" "}
        <Link href="/new" className="underline hover:text-navy-700">
          List it in two minutes
        </Link>
        .
      </p>
    </div>
  );
}
