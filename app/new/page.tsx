import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { NewListingForm } from "./form";
import { Alert } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "List something" };

export default async function NewListingPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/new");

  if (!profile.phone_verified) {
    return (
      <div className="mx-auto max-w-lg">
        <Alert tone="info">
          Confirm your phone number before publishing —{" "}
          <Link href="/onboarding?next=/new" className="underline">
            it takes ten seconds
          </Link>
          .
        </Alert>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id,slug,name_en,parent_id,accepts,requires_review")
    .order("sort_order");

  return <NewListingForm categories={categories ?? []} />;
}
