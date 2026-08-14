"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardNav({
  primary,
  groups,
  userName,
  roleLabel,
  signOutAction,
}: {
  primary: NavItem[];
  groups: NavGroup[];
  userName: string;
  roleLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown on outside click or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  // Close menus whenever the route changes.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  const linkClass = (active: boolean) =>
    `label-mono block whitespace-nowrap border px-2.5 py-2 text-[10.5px] transition ${
      active
        ? "border-teal-deep bg-teal-deep text-white"
        : "border-line bg-white text-muted hover:border-teal hover:text-teal-deep"
    }`;

  return (
    <header className="border-b-[3px] border-double border-teal-deep bg-paper">
      <div
        ref={navRef}
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3"
      >
        <Link
          href="/dashboard"
          className="shrink-0 text-base font-bold text-teal-deep"
        >
          🏢 <span className="hidden sm:inline">Building Maintenance</span>
        </Link>

        {/* Desktop nav: a few primary links plus grouped dropdowns, so the
            row never needs to scroll sideways. Wraps as a last resort. */}
        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 flex-1 lg:block"
        >
          <ul className="flex flex-wrap items-center gap-1">
            {primary.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={linkClass(isActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {groups.map((group) => {
              const groupActive = group.items.some((i) =>
                isActive(pathname, i.href)
              );
              const isOpen = openMenu === group.label;
              return (
                <li key={group.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenMenu(isOpen ? null : group.label)}
                    className={`${linkClass(groupActive)} inline-flex items-center gap-1`}
                  >
                    {group.label}
                    <span aria-hidden="true" className="text-[8px]">
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="absolute left-0 z-20 mt-1 min-w-48 border border-line bg-white py-1 shadow-[3px_3px_0_0_rgba(28,58,56,0.12)]">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={
                              isActive(pathname, item.href) ? "page" : undefined
                            }
                            className={`label-mono block px-3 py-2 text-[10.5px] ${
                              isActive(pathname, item.href)
                                ? "bg-paper-2 text-teal-deep"
                                : "text-muted hover:bg-paper-2 hover:text-teal-deep"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User chip: full name on one line, role beneath — no mid-word clipping. */}
        <div className="relative hidden shrink-0 lg:block">
          <button
            type="button"
            aria-expanded={openMenu === "__user"}
            aria-haspopup="true"
            onClick={() => setOpenMenu(openMenu === "__user" ? null : "__user")}
            className="flex items-center gap-2 border border-line bg-white px-3 py-1.5 text-left hover:border-teal"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-deep text-[11px] font-bold text-white"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block max-w-[12rem] truncate text-[13px] font-bold text-teal-deep">
                {userName}
              </span>
              <span className="label-mono block text-[9px]">{roleLabel}</span>
            </span>
            <span aria-hidden="true" className="text-[8px] text-muted">
              ▼
            </span>
          </button>
          {openMenu === "__user" && (
            <div className="absolute right-0 z-20 mt-1 min-w-52 border border-line bg-white py-1 shadow-[3px_3px_0_0_rgba(28,58,56,0.12)]">
              <Link
                href="/profile"
                className="label-mono block px-3 py-2 text-[10.5px] text-muted hover:bg-paper-2 hover:text-teal-deep"
              >
                My profile
              </Link>
              <Link
                href="/notifications"
                className="label-mono block px-3 py-2 text-[10.5px] text-muted hover:bg-paper-2 hover:text-teal-deep"
              >
                Notifications
              </Link>
              <form action={signOutAction} className="border-t border-line">
                <button
                  type="submit"
                  className="label-mono block w-full px-3 py-2 text-left text-[10.5px] text-bad hover:bg-paper-2"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>

        <button
          type="button"
          className="shrink-0 border border-line p-2 text-teal-deep lg:hidden"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen((v) => !v)}
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
            {mobileOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile: everything stacked and grouped — no horizontal scrolling. */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-line px-4 py-3 lg:hidden"
        >
          <div className="mb-3 flex items-center gap-2 border-b border-line pb-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-bold text-white"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-teal-deep">
                {userName}
              </span>
              <span className="label-mono block text-[9px]">{roleLabel}</span>
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {primary.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={linkClass(isActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {groups.map((group) => (
            <div key={group.label} className="mt-3">
              <p className="label-mono mb-1 text-[9px] text-rust">
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={
                        isActive(pathname, item.href) ? "page" : undefined
                      }
                      className={linkClass(isActive(pathname, item.href))}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-3 border-t border-line pt-3">
            <form action={signOutAction}>
              <button
                type="submit"
                className="label-mono w-full border border-line bg-white px-3 py-2 text-[10.5px] text-bad"
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
