import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/queries";
import { signOut } from "@/app/actions/auth";
import { SettingsForms } from "./forms";
import { Button, Card } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/settings");

  const supabase = await createClient();
  const { data: credentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-navy-900">Settings</h1>

      <SettingsForms profile={profile} credentials={credentials ?? []} />

      <Card>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
