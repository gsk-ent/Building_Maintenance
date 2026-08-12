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

  const links = (
    <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/dashboard" className="text-base font-bold text-slate-900">
          🏢 Building Maintenance
        </Link>
        <nav aria-label="Main navigation" className="hidden md:block">
          {links}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="max-w-40 truncate text-sm text-slate-600">{userName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 p-2 md:hidden"
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
        <nav aria-label="Mobile navigation" className="border-t border-slate-200 px-4 py-3 md:hidden">
          {links}
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
