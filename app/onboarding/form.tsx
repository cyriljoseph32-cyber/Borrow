"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/actions/profile";
import { PhoneVerify } from "@/components/phone-verify";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { LANGUAGES } from "@/lib/constants";
import { AreaSelect } from "@/components/area-select";
import type { Profile } from "@/types/database";

export function OnboardingForm({ profile, next }: { profile: Profile; next: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProfile, null);
  const [phoneDone, setPhoneDone] = useState(profile.phone_verified);

  const profileDone = state && "ok" in state && state.ok;

  useEffect(() => {
    if (profileDone && phoneDone) router.push(next);
  }, [profileDone, phoneDone, next, router]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-navy-900">Welcome to Borrow</h1>
      <p className="text-sm text-navy-400">
        Two quick steps before you can book or list anything.
      </p>

      <Card>
        <h2 className="mb-4 font-medium text-navy-900">1. Who you are</h2>
        {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}
        {profileDone && <Alert tone="success">Saved.</Alert>}

        <form action={action}>
          <Field label="Full name">
            <Input name="full_name" defaultValue={profile.full_name} required />
          </Field>
          <Field label="Where are you based?">
            <AreaSelect defaultValue={profile.area ?? ""} required placeholder="Pick an area…" />
          </Field>
          <Field label="Languages you speak" hint="Helps people know how to reach you.">
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    name="languages"
                    value={l}
                    defaultChecked={profile.languages?.includes(l)}
                  />
                  {l}
                </label>
              ))}
            </div>
          </Field>
          <Field label="A line about you" hint="Optional.">
            <Textarea name="bio" rows={3} defaultValue={profile.bio ?? ""} />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-medium text-navy-900">2. Your phone number</h2>
        <p className="mb-4 text-sm text-navy-400">
          Required before booking or listing — it is the first thing that makes people trust
          each other here.
        </p>

        <PhoneVerify
          defaultPhone={profile.phone}
          verified={profile.phone_verified}
          onVerified={() => setPhoneDone(true)}
        />
      </Card>
    </div>
  );
}
