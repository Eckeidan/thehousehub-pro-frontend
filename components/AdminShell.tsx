"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  Wallet,
  FileText,
  MessageCircle,
  Brain,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  ClipboardList,
  Moon,
  Sun,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logoutWithServer } from "@/components/SessionTimeout";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type AdminShellProps = {
  user: StoredUser | null;
  activeItem:
    | "dashboard"
    | "properties"
    | "tenants"
    | "vendors"
    | "maintenance"
    | "payments"
    | "todo"
    | "communications"
    | "AI Assistant"
    | "documents"
    | "reports"
    | "insights"
    | "settings";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const menuItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    key: "properties",
    label: "Properties",
    href: "/properties",
    icon: <Building2 size={18} />,
  },
  {
    key: "tenants",
    label: "Tenants",
    href: "/tenants",
    icon: <Users size={18} />,
  },
  {
    key: "vendors",
    label: "Vendors",
    href: "/vendors",
    icon: <Wrench size={18} />,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    icon: <Wrench size={18} />,
  },
  {
    key: "payments",
    label: "Financials",
    href: "/payments",
    icon: <Wallet size={18} />,
  },
  {
    key: "todo",
    label: "To Do",
    href: "/todo",
    icon: <ClipboardList size={18} />,
  },
  {
    key: "communications",
    label: "Messages",
    href: "/communications",
    icon: <MessageCircle size={18} />,
  },
  
  {
    key: "documents",
    label: "Documents",
    href: "/documents",
    icon: <FileText size={18} />,
  },
  {
    key: "reports",
    label: "Reports",
    href: "/reports",
    icon: <BarChart3 size={18} />,
  },
  {
    key: "insights",
    label: "AI Insights",
    href: "/insights",
    icon: <Brain size={18} />,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings",
    icon: <Settings size={18} />,
  },
];

const SIDEBAR_COLLAPSED_KEY = "thehousehub.adminSidebarCollapsed";
const THEME_KEY = "thehousehub.theme";
const LEGACY_SUPER_OWNER_THEME_KEY = "thehousehub.superOwnerTheme";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AdminShell({
  user,
  activeItem,
  title,
  subtitle,
  actions,
  children,
}: AdminShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme =
      localStorage.getItem(THEME_KEY) ||
      localStorage.getItem(LEGACY_SUPER_OWNER_THEME_KEY);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
  });
  const [todoCount, setTodoCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_COLLAPSED_KEY,
      String(desktopSidebarCollapsed)
    );
  }, [desktopSidebarCollapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LEGACY_SUPER_OWNER_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadTodoCount() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/payments/todos`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => null);

        if (!cancelled) {
          setTodoCount(Number(data?.count || 0));
        }
      } catch (error) {
        console.error("Admin todo count error:", error);
      }
    }

    loadTodoCount();
    const interval = window.setInterval(loadTodoCount, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const normalizedRole = String(user?.role || "").trim().toUpperCase();

  const displayRole =
    normalizedRole === "OWNER"
      ? "Super Admin"
      : normalizedRole === "ADMIN"
      ? "Admin"
      : "User";

  const initials =
    (user?.fullName || user?.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  function handleLogout() {
    logoutWithServer("logout");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl transition-all duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopSidebarCollapsed ? "lg:w-24" : "lg:w-72"}`}
      >
        <div className={`flex items-center justify-between border-b border-white/10 px-6 py-7 ${
          desktopSidebarCollapsed ? "lg:px-4" : ""
        }`}>
          <div className={desktopSidebarCollapsed ? "lg:hidden" : ""}>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">The House</span>{" "}
              <span className="text-emerald-400">Hub</span>
            </h1>
            <p className="mt-2 text-xs text-blue-100/60">
              Smart Property Management
            </p>
          </div>

          <div
            className={`hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-black text-white lg:flex ${
              desktopSidebarCollapsed ? "" : "lg:hidden"
            }`}
          >
            HH
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl bg-white/10 p-2 text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p
            className={`mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50 ${
              desktopSidebarCollapsed ? "lg:text-center lg:text-[10px]" : ""
            }`}
          >
            Main Menu
          </p>

          <div className="space-y-2">
            {menuItems.map((item) => {
              const itemBadgeCount = item.key === "todo" ? todoCount : 0;
              const itemTitle =
                itemBadgeCount > 0
                  ? `${item.label} (${itemBadgeCount > 99 ? "99+" : itemBadgeCount})`
                  : item.label;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    activeItem === item.key
                      ? "bg-white/15 text-white shadow"
                      : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                  } ${
                    desktopSidebarCollapsed ? "lg:justify-center lg:px-3" : ""
                  }`}
                  title={desktopSidebarCollapsed ? itemTitle : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span
                    className={`min-w-0 flex-1 ${
                      desktopSidebarCollapsed ? "lg:hidden" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                  {itemBadgeCount > 0 && (
                    <span
                      className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white shadow-sm ring-1 ring-white/25 ${
                        desktopSidebarCollapsed ? "lg:hidden" : ""
                      }`}
                      aria-label={`${itemBadgeCount} pending approvals`}
                    >
                      {itemBadgeCount > 99 ? "99+" : itemBadgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={`border-t border-white/10 px-6 py-5 ${
          desktopSidebarCollapsed ? "lg:px-4" : ""
        }`}>
          <p className={`text-xs uppercase tracking-widest text-blue-200/50 ${
            desktopSidebarCollapsed ? "lg:text-center lg:text-[10px]" : ""
          }`}>
            Current Role
          </p>
          <p className={`mt-1 text-sm text-blue-100 ${
            desktopSidebarCollapsed ? "lg:text-center lg:text-xs" : ""
          }`}>
            {displayRole}
          </p>

          <div className={`mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 ${
            desktopSidebarCollapsed ? "lg:justify-center lg:px-2" : ""
          }`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
              {initials}
            </div>

            <div className={`min-w-0 ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold text-white">
                {user?.fullName || user?.name || "User"}
              </p>
              <p className="text-xs text-blue-100/80">{displayRole}</p>
              <p className="mt-1 truncate rounded-lg bg-black/20 px-2 py-1 text-[10px] font-mono text-emerald-200">
                Org: {user?.organizationId || "No organizationId"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white ${
              desktopSidebarCollapsed ? "lg:px-3" : ""
            }`}
            title={desktopSidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut size={16} />
            <span className={desktopSidebarCollapsed ? "lg:hidden" : ""}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen transition-all duration-300 ${
          desktopSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              <button
                onClick={() => setDesktopSidebarCollapsed((value) => !value)}
                className="mt-1 hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 lg:inline-flex"
                aria-label={
                  desktopSidebarCollapsed
                    ? "Show sidebar"
                    : "Hide sidebar"
                }
                title={
                  desktopSidebarCollapsed
                    ? "Show sidebar"
                    : "Hide sidebar"
                }
              >
                {desktopSidebarCollapsed ? (
                  <PanelLeftOpen size={20} />
                ) : (
                  <PanelLeftClose size={20} />
                )}
              </button>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h2>

                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {actions}

              <Link
                href="/todo"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Open approvals"
                title="Approvals and notifications"
              >
                <Bell size={18} />
                {todoCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                    {todoCount > 99 ? "99+" : todoCount}
                  </span>
                )}
              </Link>

              <button
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {initials}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.fullName || user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                  <p className="max-w-[180px] truncate text-[10px] font-mono text-emerald-600">
                    Org: {user?.organizationId || "No organizationId"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8">{children}</div>

        <footer className="mt-8 border-t border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950 sm:px-6 md:px-8">
          <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© 2026 The House Hub. All rights reserved.</p>
            <p>Built for Smart Property Management.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
