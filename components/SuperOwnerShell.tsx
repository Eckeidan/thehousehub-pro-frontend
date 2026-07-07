"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sun,
  UserPlus,
  Wifi,
  X,
} from "lucide-react";
import { logoutWithServer } from "@/components/SessionTimeout";

export type SuperOwnerNavItem =
  | "dashboard"
  | "organizations"
  | "create-admin"
  | "online"
  | "audit";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type SuperOwnerShellProps = {
  user: StoredUser | null;
  activeItem: SuperOwnerNavItem;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const THEME_KEY = "thehousehub.theme";
const LEGACY_THEME_KEY = "thehousehub.superOwnerTheme";
const SIDEBAR_COLLAPSED_KEY = "thehousehub.superOwnerSidebarCollapsed";

const menuItems: Array<{
  key: SuperOwnerNavItem;
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Metrics and graphics",
    href: "/super-owner",
    icon: <LayoutDashboard size={18} />,
  },
  {
    key: "organizations",
    label: "Organizations",
    description: "Landlords and properties",
    href: "/super-owner/organizations",
    icon: <Building2 size={18} />,
  },
  {
    key: "create-admin",
    label: "Create Admin",
    description: "Super Owner access",
    href: "/super-owner/create-admin",
    icon: <UserPlus size={18} />,
  },
  {
    key: "online",
    label: "Online",
    description: "Active users",
    href: "/super-owner/online",
    icon: <Wifi size={18} />,
  },
  {
    key: "audit",
    label: "Audit",
    description: "Who did what",
    href: "/super-owner/audit",
    icon: <ShieldCheck size={18} />,
  },
];

export default function SuperOwnerShell({
  user,
  activeItem,
  title,
  subtitle,
  actions,
  children,
}: SuperOwnerShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme =
      localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  });
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(desktopSidebarCollapsed));
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LEGACY_THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      return next;
    });
  }

  function handleLogout() {
    logoutWithServer("logout");
  }

  const initials = useMemo(() => {
    return (
      (user?.fullName || user?.name || "Platform Admin")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "PA"
    );
  }, [user?.fullName, user?.name]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-slate-200 bg-white/95 text-slate-950 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/95 dark:text-white lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } ${desktopSidebarCollapsed ? "lg:w-24" : "lg:w-80"}`}
        >
          <div
            className={`flex items-center justify-between border-b border-slate-200 px-5 py-6 dark:border-white/10 ${
              desktopSidebarCollapsed ? "lg:px-4" : ""
            }`}
          >
            <Link
              href="/super-owner"
              className={`min-w-0 ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <ShieldCheck size={14} />
                SUPER_OWNER
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight">
                Platform Center
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Global oversight and support
              </p>
            </Link>

            <Link
              href="/super-owner"
              className={`hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/20 lg:flex ${
                desktopSidebarCollapsed ? "" : "lg:hidden"
              }`}
            >
              SO
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl border border-slate-200 p-2 text-slate-600 dark:border-white/10 dark:text-slate-300 lg:hidden"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <p
              className={`mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ${
                desktopSidebarCollapsed ? "lg:text-center lg:text-[10px]" : ""
              }`}
            >
              Menu
            </p>

            <div className="space-y-2">
              {menuItems.map((item) => {
                const active =
                  activeItem === item.key ||
                  (item.href !== "/super-owner" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    } ${
                      desktopSidebarCollapsed
                        ? "lg:justify-center lg:px-3"
                        : ""
                    }`}
                    title={desktopSidebarCollapsed ? item.label : undefined}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:text-slate-950 dark:bg-white/5 dark:text-slate-300 dark:group-hover:text-white"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`min-w-0 flex-1 ${
                        desktopSidebarCollapsed ? "lg:hidden" : ""
                      }`}
                    >
                      <span className="block truncate">{item.label}</span>
                      <span
                        className={`mt-0.5 block truncate text-xs font-medium ${
                          active
                            ? "text-blue-100"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      className={`${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                      } ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}
                    />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4 dark:border-white/10">
            <div
              className={`rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04] ${
                desktopSidebarCollapsed ? "lg:hidden" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {user?.fullName || user?.name || "Platform Admin"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || "super-owner"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100 dark:hover:bg-rose-400/20 ${
                desktopSidebarCollapsed ? "lg:px-3" : ""
              }`}
              title="Logout"
            >
              <LogOut size={18} />
              <span className={desktopSidebarCollapsed ? "lg:hidden" : ""}>
                Logout
              </span>
            </button>
          </div>
        </aside>

        <div
          className={`min-h-screen transition-all duration-300 ${
            desktopSidebarCollapsed ? "lg:pl-24" : "lg:pl-80"
          }`}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>

                <button
                  onClick={() =>
                    setDesktopSidebarCollapsed((current) => !current)
                  }
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 lg:inline-flex"
                  aria-label="Toggle sidebar"
                >
                  {desktopSidebarCollapsed ? (
                    <PanelLeftOpen size={20} />
                  ) : (
                    <PanelLeftClose size={20} />
                  )}
                </button>

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {actions}
                <button
                  onClick={toggleTheme}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
