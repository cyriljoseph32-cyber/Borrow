import Link from "next/link";
import { currentProfile, avatarUrl } from "@/lib/queries";
import { Avatar } from "@/components/ui";

export async function SiteHeader() {
  const profile = await currentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-sand/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-navy-900">
          borrow<span className="text-terracotta">.</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm text-navy-700 sm:flex">
          <Link href="/browse" className="hover:text-navy-900">
            Browse
          </Link>
          <Link href="/how-it-works" className="hover:text-navy-900">
            How it works
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {profile ? (
            <>
              <Link href="/home" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                Home
              </Link>
              <Link href="/new" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                List something
              </Link>
              <Link href="/messages" className="text-navy-700 hover:text-navy-900">
                Messages
              </Link>
              <Link href="/my/bookings" className="text-navy-700 hover:text-navy-900">
                Items
              </Link>
              <Link href="/contacts" className="hidden text-navy-700 hover:text-navy-900 sm:block">
                Contacts
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className="text-brick hover:text-brick-dark">
                  Admin
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
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
