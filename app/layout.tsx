import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Borrow — rent the gear, book the person",
    template: "%s · Borrow",
  },
  description:
    "Rent diving, watersports and adventure gear from people around you on Koh Samui — and book the instructor who knows how to use it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main className="mx-auto min-h-[calc(100vh-8.5rem)] max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-navy-100 bg-white/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-navy-400 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Borrow — Koh Samui pilot.</p>
            <nav className="flex gap-4 sm:ml-auto">
              <Link href="/how-it-works" className="hover:text-navy-700">
                How it works
              </Link>
              <Link href="/safety" className="hover:text-navy-700">
                Safety
              </Link>
              <Link href="/terms" className="hover:text-navy-700">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-navy-700">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
