import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/queries";
import { OnboardingForm } from "./form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const profile = await currentProfile();
  if (!profile) redirect("/login");

  return <OnboardingForm profile={profile} next={next ?? "/"} />;
}
