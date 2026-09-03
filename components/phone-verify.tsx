"use client";

import { useActionState, useState } from "react";
import { sendPhoneOtp, verifyPhoneOtp } from "@/app/actions/profile";
import { Alert, Button, Field, Input } from "@/components/ui";

/**
 * Vérification du téléphone en deux étapes (numéro -> code SMS).
 * Utilisé sur /settings et /onboarding.
 */
export function PhoneVerify({
  defaultPhone,
  verified,
  onVerified,
}: {
  defaultPhone: string | null;
  verified: boolean;
  onVerified?: () => void;
}) {
  const [sendState, sendAction, sendPending] = useActionState(sendPhoneOtp, null);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyPhoneOtp, null);
  const [isVerified, setIsVerified] = useState(verified);

  const awaitingCode =
    sendState && "ok" in sendState && sendState.ok && sendState.verified === false && !isVerified;
  const phoneForOtp = (sendState && "phone" in sendState ? sendState.phone : defaultPhone) ?? "";

  if (verifyState && "ok" in verifyState && verifyState.ok && !isVerified) {
    setIsVerified(true);
    onVerified?.();
  }
  if (sendState && "verified" in sendState && sendState.verified && !isVerified) {
    setIsVerified(true);
    onVerified?.();
  }

  if (isVerified) {
    return <Alert tone="success">Phone verified.</Alert>;
  }

  if (awaitingCode) {
    return (
      <div>
        <p className="mb-3 text-sm text-navy-400">
          We sent a code by SMS to <strong>{phoneForOtp}</strong>.
        </p>
        {verifyState && "error" in verifyState && verifyState.error && (
          <Alert tone="error">{verifyState.error}</Alert>
        )}
        <form action={verifyAction} className="flex items-end gap-2">
          <input type="hidden" name="phone" value={phoneForOtp} />
          <div className="flex-1">
            <Field label="Code">
              <Input name="code" inputMode="numeric" placeholder="123456" required autoFocus />
            </Field>
          </div>
          <Button type="submit" variant="secondary" disabled={verifyPending} className="mb-4">
            {verifyPending ? "…" : "Verify"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {sendState && "error" in sendState && sendState.error && (
        <Alert tone="error">{sendState.error}</Alert>
      )}
      <form action={sendAction} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Number">
            <Input name="phone" defaultValue={defaultPhone ?? ""} placeholder="+66 …" required />
          </Field>
        </div>
        <Button type="submit" variant="secondary" disabled={sendPending} className="mb-4">
          {sendPending ? "…" : "Send code"}
        </Button>
      </form>
    </div>
  );
}
