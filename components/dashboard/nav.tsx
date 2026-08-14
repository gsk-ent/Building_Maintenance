"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export function DashboardNav({
  items,
  userName,
  signOutAction,
}: {
  items: NavItem[];
  userName: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Admins can see 9-10 nav items. Below `lg` we always use the hamburger
  // menu (stacked, scrolls with the page); at `lg`+ the row is horizontally
  // scrollable as a safety net so extra items never break the layout.
  const links = (isMobile: boolean) => (
    <ul
      className={
        isMobile
          ? "flex flex-col gap-1"
          : "flex flex-nowrap items-center gap-1 overflow-x-auto"
      }
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href} className={isMobile ? "" : "shrink-0"}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`block whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="shrink-0 text-base font-bold text-slate-900">
          🏢 <span className="hidden sm:inline">Building Maintenance</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 lg:block">
          {links(false)}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <span className="max-w-32 truncate text-sm text-slate-600">{userName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-300 p-2 lg:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-slate-200 px-4 py-3 lg:hidden">
          {links(true)}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="truncate text-sm text-slate-600">{userName}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
