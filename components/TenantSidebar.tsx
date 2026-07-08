"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

type TenantSidebarProps = {
  fullName: string;
  email?: string | null;
  onLogout: () => void;
  onClose?: () => void;
  mobile?: boolean;
  unreadMessageCount?: number;
};

function getInitials(name?: string | null) {
  if (!name) return "TN";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatBadgeCount(count?: number) {
  if (!count || count < 1) return null;
  return count > 99 ? "99+" : String(count);
}

export default function TenantSidebar({
  fullName,
  email,
  onLogout,
  onClose,
  mobile = false,
  unreadMessageCount = 0,
}: TenantSidebarProps) {
  const pathname = usePathname();
  const initials = getInitials(fullName);
  const messageBadge = formatBadgeCount(unreadMessageCount);

  const items = [
    { label: "Overview", href: "/tenant", icon: <Home size={18} /> },
    { label: "Payments", href: "/tenant/payments", icon: <CreditCard size={18} /> },
    { label: "Maintenance", href: "/tenant/maintenance", icon: <Wrench size={18} /> },
    { label: "Documents", href: "/tenant/documents", icon: <FileText size={18} /> },
    { label: "AI Assistant", href: "/tenant/chatbot", icon: <Sparkles size={18} /> },
    {
      label: "Contact Landlord",
      href: "/tenant/contact",
      icon: <MessageCircle size={18} />,
      badge: messageBadge,
    },
    { label: "Notifications", href: "/tenant/notifications", icon: <Bell size={18} /> },
    { label: "Settings", href: "/tenant/settings", icon: <Settings size={18} /> },
  ];

  return (
    <>
      <div>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">The House Hub</h1>
            <p className="mt-1 text-sm text-blue-100/70">
              Premium Tenant Workspace
            </p>
          </div>

          {mobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Close tenant menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{fullName}</p>
                <p className="truncate text-sm text-blue-100/70">
                  {email || "Tenant"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-4 pb-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-blue-200/50">
            Tenant Menu
          </p>

          <div className="space-y-2" onClick={onClose}>
            {items.map((item) => (
              <SidebarItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                badge={item.badge}
                active={
                  item.href === "/tenant"
                    ? pathname === "/tenant"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
              />
            ))}
          </div>
        </nav>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );
}

function SidebarItem({
  label,
  icon,
  href,
  active = false,
  badge,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  active?: boolean;
  badge?: string | null;
}) {
  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white shadow"
            : "text-blue-100/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold leading-5 text-white shadow-lg shadow-red-950/20">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}
