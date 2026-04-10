"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  Wallet,
  FileText,
  Brain,
  Settings,
  LogOut,
  Home,
} from "lucide-react";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AdminShellProps = {
  children: ReactNode;
  user: StoredUser | null;
  activeItem?:
    | "dashboard"
    | "properties"
    | "tenants"
    | "units"
    | "vendors"
    | "maintenance"
    | "payments"
    | "documents"
    | "insights"
    | "settings";
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function AdminShell({
  children,
  user,
  activeItem = "dashboard",
  title,
  subtitle,
  actions,
}: AdminShellProps) {
  const router = useRouter();

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-blue-950 via-blue-900 to-slate-900 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-7">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">The House</span>{" "}
              <span className="text-emerald-400">Hub</span>
            </h1>

            <p className="mt-2 text-xs text-blue-100/60">
              Smart Property Management
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
              Main Menu
            </p>

            <div className="space-y-2">
              <SidebarItem
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                href="/dashboard"
                active={activeItem === "dashboard"}
              />
              <SidebarItem
                label="Properties"
                icon={<Building2 size={18} />}
                href="/properties"
                active={activeItem === "properties"}
              />
              <SidebarItem
                label="Tenants"
                icon={<Users size={18} />}
                href="/tenants"
                active={activeItem === "tenants"}
              />
              <SidebarItem
                label="Units"
                icon={<Home size={18} />}
                href="/units"
                active={activeItem === "units"}
              />
              <SidebarItem
                label="Vendors"
                icon={<Wrench size={18} />}
                href="/vendors"
                active={activeItem === "vendors"}
              />
              <SidebarItem
                label="Maintenance"
                icon={<Wrench size={18} />}
                href="/maintenance"
                active={activeItem === "maintenance"}
              />
              <SidebarItem
                label="Financials"
                icon={<Wallet size={18} />}
                href="/payments"
                active={activeItem === "payments"}
              />
              <SidebarItem
                label="Documents"
                icon={<FileText size={18} />}
                href="/documents"
                active={activeItem === "documents"}
              />
              <SidebarItem
                label="AI Insights"
                icon={<Brain size={18} />}
                href="/insights"
                active={activeItem === "insights"}
              />
              <SidebarItem
                label="Settings"
                icon={<Settings size={18} />}
                href="/settings"
                active={activeItem === "settings"}
              />
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-blue-200/50">
              Current Role
            </p>
            <p className="mt-2 font-semibold">{displayRole}</p>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || user?.name || "User"}
                </p>
                <p className="truncate text-xs text-blue-100/80">
                  {user?.email || displayRole}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 lg:ml-72">
          {(title || subtitle || actions) && (
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
              <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                <div>
                  {title && (
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
                </div>

                {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
              </div>
            </header>
          )}

          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  href,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white shadow"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}