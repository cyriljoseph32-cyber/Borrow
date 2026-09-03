import Link from "next/link";
import { currentProfile, avatarUrl } from "@/lib/queries";
import { Avatar } from "@/components/ui";
import { LangSwitch } from "@/components/lang-switch";
import { getLocale, t } from "@/lib/i18n";

export async function SiteHeader() {
  const [profile, locale] = await Promise.all([currentProfile(), getLocale()]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-sand/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-navy-900">
          borrow<span className="text-terracotta">.</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-navy-700 sm:flex">
          <Link href="/browse" className="hover:text-navy-900">
            {t(locale, "nav.browse")}
          </Link>
          <Link href="/how-it-works" className="hover:text-navy-900">
            {t(locale, "nav.howItWorks")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <LangSwitch locale={locale} />
          {profile ? (
            <>
              <Link href="/home" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                Home
              </Link>
              <Link href="/new" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                {t(locale, "nav.list")}
              </Link>
              <Link href="/messages" className="text-navy-700 hover:text-navy-900">
                {t(locale, "nav.messages")}
              </Link>
              <Link href="/my/bookings" className="text-navy-700 hover:text-navy-900">
                Items
              </Link>
              <Link href="/contacts" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                Contacts
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className="text-brick hover:text-brick-dark">
                  {t(locale, "nav.admin")}
                </Link>
              )}
              <Link href="/settings" aria-label="Settings">
                <Avatar
                  src={avatarUrl(profile.avatar_url)}
                  name={profile.full_name || profile.email}
                  size={32}
                />
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-terracotta px-3 py-1.5 font-semibold text-sand hover:bg-terracotta-dark"
            >
              {t(locale, "nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
