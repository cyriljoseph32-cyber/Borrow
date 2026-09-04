"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions/profile";
import { addCredential } from "@/app/actions/credentials";
import { PhoneVerify } from "@/components/phone-verify";
import { Alert, Button, Card, Field, Input, Select, Textarea, Badge } from "@/components/ui";
import { LANGUAGES, CREDENTIAL_KINDS } from "@/lib/constants";
import { AreaSelect } from "@/components/area-select";
import { shortDate } from "@/lib/format";
import type { Credential, Profile } from "@/types/database";

export function SettingsForms({
  profile,
  credentials,
}: {
  profile: Profile;
  credentials: Credential[];
}) {
  const [state, action, pending] = useActionState(saveProfile, null);
  const [credState, credAction, credPending] = useActionState(addCredential, null);

  return (
    <>
      <Card>
        <h2 className="mb-4 font-medium text-navy-900">Profile</h2>
        {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}
        {state && "ok" in state && state.ok && <Alert tone="success">Saved.</Alert>}

        <form action={action}>
          <Field label="Full name">
            <Input name="full_name" defaultValue={profile.full_name} required />
          </Field>
          <Field label="Area">
            <AreaSelect defaultValue={profile.area ?? ""} placeholder="—" />
          </Field>
          <Field label="Languages">
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
          <Field label="Bio">
            <Textarea name="bio" rows={3} defaultValue={profile.bio ?? ""} />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-medium text-navy-900">Phone</h2>
        <p className="mb-4 text-sm text-navy-400">
          {profile.phone_verified ? "" : "Required before booking or listing."}
        </p>
        <PhoneVerify defaultPhone={profile.phone} verified={profile.phone_verified} />
      </Card>

      <Card>
        <h2 className="mb-1 font-medium text-navy-900">Certifications</h2>
        <p className="mb-4 text-sm text-navy-400">
          Needed to offer regulated services (diving, coaching). The Borrow team verifies them by
          hand — that check is what makes the badge mean something.
        </p>

        {credentials.length > 0 && (
          <ul className="mb-4 space-y-2">
            {credentials.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-navy-700">
                <span>
                  {c.issuer ? `${c.issuer} · ` : ""}
                  {c.kind.replace("_", " ")}
                  {c.reference ? ` · ${c.reference}` : ""}
                </span>
                {c.verified_at ? (
                  <Badge tone="success">verified {shortDate(c.verified_at)}</Badge>
                ) : (
                  <Badge tone="warning">pending</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {credState && "error" in credState && credState.error && (
          <Alert tone="error">{credState.error}</Alert>
        )}
        {credState && "ok" in credState && credState.ok && (
          <Alert tone="success">Sent for verification.</Alert>
        )}

        <form action={credAction}>
          <Field label="Type">
            <Select name="kind" required>
              {CREDENTIAL_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Issuer" hint="PADI, SSI, EFR…">
              <Input name="issuer" />
            </Field>
            <Field label="Reference number">
              <Input name="reference" />
            </Field>
          </div>
          <Field label="Expiry date" hint="Optional.">
            <Input name="expires_on" type="date" />
          </Field>
          <Button type="submit" variant="secondary" disabled={credPending}>
            {credPending ? "…" : "Submit for verification"}
          </Button>
        </form>
      </Card>
    </>
  );
}
