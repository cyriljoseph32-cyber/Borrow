import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { currentProfile } from "@/lib/queries";
import { getLocale, t } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Borrow — rent anything, book the person",
    template: "%s · Borrow",
  },
  description:
    "Rent bikes, tools, camping gear, dive equipment and more from people around you on Koh Samui, Koh Phangan and Koh Tao — or book the instructor who knows how to use it.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [profile, locale] = await Promise.all([currentProfile(), getLocale()]);

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main
          className={`mx-auto min-h-[calc(100vh-8.5rem)] max-w-6xl px-4 py-8 ${
            profile ? "pb-24 sm:pb-8" : ""
          }`}
        >
          {children}
        </main>
        <footer className="hidden border-t border-navy-100 bg-white/40 sm:block">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-navy-400 sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {t(locale, "footer.copyright")}
            </p>
            <nav className="flex gap-4 sm:ml-auto">
              <Link href="/how-it-works" className="hover:text-navy-700">
                {t(locale, "footer.howItWorks")}
              </Link>
              <Link href="/safety" className="hover:text-navy-700">
                {t(locale, "footer.safety")}
              </Link>
              <Link href="/terms" className="hover:text-navy-700">
                {t(locale, "footer.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-navy-700">
                {t(locale, "footer.privacy")}
              </Link>
            </nav>
          </div>
        </footer>
        {profile && <BottomNav />}
      </body>
    </html>
  );
}
