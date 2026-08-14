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
              className={`label-mono block whitespace-nowrap border px-2.5 py-2 text-[10.5px] transition ${
                active
                  ? "border-teal-deep bg-teal-deep text-white"
                  : "border-line bg-white text-muted hover:border-teal hover:text-teal-deep"
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
    <header className="border-b-[3px] border-double border-teal-deep bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/dashboard"
          className="shrink-0 text-base font-bold text-teal-deep"
        >
          🏢 <span className="hidden sm:inline">Building Maintenance</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 flex-1 lg:block"
        >
          {links(false)}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <span className="label-mono max-w-32 truncate text-[11px]">
            {userName}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="label-mono whitespace-nowrap border border-line bg-white px-3 py-1.5 text-[10.5px] text-teal-deep hover:bg-paper-2"
            >
              Sign out
            </button>
          </form>
        </div>
        <button
          type="button"
          className="shrink-0 border border-line p-2 text-teal-deep lg:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-line px-4 py-3 lg:hidden"
        >
          {links(true)}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="label-mono truncate text-[11px]">{userName}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="label-mono border border-line bg-white px-3 py-1.5 text-[10.5px] text-teal-deep"
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
