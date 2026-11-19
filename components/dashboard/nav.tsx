"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  Receipt,
  ScrollText,
  Settings,
  User,
  Users,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

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

/** Icon per route — nav is icon + label now, never emoji. */
const ITEM_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/maintenance": Wrench,
  "/work-orders": ClipboardList,
  "/finances/dues": Receipt,
  "/finances/my-dues": Receipt,
  "/finances/expenses": Banknote,
  "/finances/payment-settings": CreditCard,
  "/finances/reports": BarChart3,
  "/properties": Building2,
  "/admin/users": Users,
  "/admin/activity": ScrollText,
  "/profile": User,
  "/notifications": Bell,
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  Finances: Wallet,
  Manage: Settings,
};

function NavIcon({ href, className }: { href: string; className: string }) {
  const Icon = ITEM_ICONS[href] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden="true" />;
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

  // 14px labels, 44px touch targets, focus-visible rings — the old
  // 10.5px Courier links failed all three.
  const linkClass = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep ${
      active
        ? "bg-teal-deep/10 text-teal-deep"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const dropdownLinkClass = (active: boolean) =>
    `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep ${
      active
        ? "bg-teal-deep/10 font-medium text-teal-deep"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div
        ref={navRef}
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6"
      >
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-deep text-white"
          >
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Building Maintenance
          </span>
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
                  <NavIcon href={item.href} className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}

            {groups.map((group) => {
              const groupActive = group.items.some((i) =>
                isActive(pathname, i.href)
              );
              const isOpen = openMenu === group.label;
              const GroupIcon = GROUP_ICONS[group.label] ?? Settings;
              return (
                <li key={group.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenMenu(isOpen ? null : group.label)}
                    className={linkClass(groupActive)}
                  >
                    <GroupIcon className="h-4 w-4" aria-hidden="true" />
                    {group.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <ul className="absolute left-0 z-20 mt-1 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={
                              isActive(pathname, item.href) ? "page" : undefined
                            }
                            className={dropdownLinkClass(
                              isActive(pathname, item.href)
                            )}
                          >
                            <NavIcon href={item.href} className="h-4 w-4" />
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
            className="flex min-h-11 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-deep text-xs font-bold text-white"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block max-w-[12rem] truncate text-sm font-semibold text-slate-900">
                {userName}
              </span>
              <span className="block text-xs text-slate-500">{roleLabel}</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${openMenu === "__user" ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {openMenu === "__user" && (
            <div className="absolute right-0 z-20 mt-1 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <Link href="/profile" className={dropdownLinkClass(false)}>
                <User className="h-4 w-4" aria-hidden="true" />
                My profile
              </Link>
              <Link href="/notifications" className={dropdownLinkClass(false)}>
                <Bell className="h-4 w-4" aria-hidden="true" />
                Notifications
              </Link>
              <form
                action={signOutAction}
                className="border-t border-slate-200 pt-1.5"
              >
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>

        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-deep lg:hidden"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile: everything stacked and grouped — no horizontal scrolling. */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-bold text-white"
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {userName}
              </span>
              <span className="block text-xs text-slate-500">{roleLabel}</span>
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
                  <NavIcon href={item.href} className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {groups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="label-mono mb-2 px-1">{group.label}</p>
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
                      <NavIcon href={item.href} className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-4 border-t border-slate-200 pt-3">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
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
