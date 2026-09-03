"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";

export function LangSwitch({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setLocale(locale === "en" ? "th" : "en"))}
      className="rounded-full border border-navy-200 px-2.5 py-1 text-xs font-medium text-navy-700 hover:border-navy-600 disabled:opacity-50"
      aria-label="Switch language"
    >
      {locale === "en" ? "ไทย" : "EN"}
    </button>
  );
}
