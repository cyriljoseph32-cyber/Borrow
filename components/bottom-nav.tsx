"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", emoji: "🏡" },
  { href: "/my/bookings", label: "Items", emoji: "📦" },
  { href: "/contacts", label: "Contacts", emoji: "🤝" },
  { href: "/settings", label: "Profile", emoji: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || (tab.href !== "/home" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                active ? "text-terracotta" : "text-navy-400"
              }`}
            >
              <span className="text-lg leading-none">{tab.emoji}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
