"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signInWithEmail } from "@/app/actions/auth";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [state, action, pending] = useActionState(signInWithEmail, null);

  return (
    <Card className="mx-auto mt-10 max-w-md">
      <h1 className="mb-1 text-xl font-semibold text-navy-900">Sign in to Borrow</h1>
      <p className="mb-5 text-sm text-navy-400">
        We send you a magic link — no password to remember.
      </p>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}
      {state && "sent" in state && state.sent && (
        <Alert tone="success">Check your inbox — the link is valid for one hour.</Alert>
      )}

      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@example.com" autoFocus />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send magic link"}
        </Button>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
