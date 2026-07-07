"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminShell from "@/components/AdminShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
};

type ReportPayload = {
  generatedAt: string;
  organization?: { name?: string; email?: string; companyName?: string } | null;
  filters: Record<string, string | null>;
  summary: {
    properties: number;
    tenants: number;
    occupiedProperties: number;
    occupancyRate: number;
    totalRevenue: number;
    pendingRevenue: number;
    rejectedRevenue: number;
    totalRentPotential: number;
    maintenanceOpen: number;
    maintenanceTotal: number;
  };
  charts: {
    revenueByMonth: Array<{
      month: string;
      paid: number;
      pending: number;
      rejected: number;
      payments: number;
    }>;
    propertyPerformance: Array<{
      id: string;
      code: string;
      name: string;
      city: string;
      state: string;
      tenants: number;
      monthlyRent: number;
      paid: number;
      pending: number;
      rejected: number;
      maintenance: number;
    }>;
  };
  options: {
    properties: Array<{ id: string; name: string; code: string }>;
    tenants: Array<{ id: string; name: string; email?: string | null }>;
  };
  tables: {
    payments: Array<Record<string, string | number>>;
    properties: Array<Record<string, string | number>>;
    tenants: Array<Record<string, string | number>>;
    maintenance: Array<Record<string, string | number>>;
  };
};

type ReportSchedule = {
  id: string;
  name: string;
  frequency: string;
  recipients: string[];
  isActive: boolean;
  nextRunAt: string;
  lastSentAt?: string | null;
};

const paymentStatuses = ["ALL", "PENDING", "PAID", "FAILED", "PARTIAL", "OVERDUE", "WAIVED"];
const paymentMethods = ["ALL", "CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "CHECK", "OTHER"];
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-blue-500/20";

function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export default function ReportsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    propertyId: "ALL",
    tenantId: "ALL",
    status: "ALL",
    paymentMethod: "ALL",
  });
  const [recipientText, setRecipientText] = useState("");
  const [frequency, setFrequency] = useState("WEEKLY");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      const role = String(parsedUser?.role || "").trim().toUpperCase();

      if (role === "TENANT") {
        router.replace("/tenant");
        return;
      }

      setUser(parsedUser);
      setRecipientText(parsedUser.email || "");
      setCheckingAuth(false);
    } catch (authError) {
      console.error("Reports auth error:", authError);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  }, [router]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const [reportRes, schedulesRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports?${queryString}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
        fetch(`${API_BASE}/api/reports/schedules`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token || ""}` },
        }),
      ]);

      if (reportRes.status === 401 || schedulesRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
        return;
      }

      const reportData = await reportRes.json().catch(() => null);
      const schedulesData = await schedulesRes.json().catch(() => null);

      if (!reportRes.ok) throw new Error(reportData?.error || "Failed to load report.");
      if (!schedulesRes.ok) throw new Error(schedulesData?.error || "Failed to load schedules.");

      setReport(reportData);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (loadError: any) {
      console.error("Reports load error:", loadError);
      setError(loadError?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAuth) loadReports();
  }, [checkingAuth, queryString]);

  function recipients() {
    return recipientText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function sendReport() {
    try {
      setSending(true);
      setError("");
      setSuccess("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reports/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ filters, recipients: recipients() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to send report.");
      setSuccess("Report emailed successfully.");
    } catch (sendError: any) {
      setError(sendError?.message || "Failed to send report.");
    } finally {
      setSending(false);
    }
  }

  async function createSchedule() {
    try {
      setScheduling(true);
      setError("");
      setSuccess("");
      const targetRecipients = recipients();
      if (!targetRecipients.length) {
        setError("Add at least one recipient before scheduling.");
        return;
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reports/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          name: "Landlord portfolio report",
          frequency,
          recipients: targetRecipients,
          filters,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to schedule report.");
      setSuccess("Automatic report schedule created.");
      await loadReports();
    } catch (scheduleError: any) {
      setError(scheduleError?.message || "Failed to schedule report.");
    } finally {
      setScheduling(false);
    }
  }

  function exportJson() {
    if (!report) return;
    downloadFile(
      `the-house-hub-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      "application/json"
    );
  }

  function exportCsv(tableName: keyof ReportPayload["tables"]) {
    if (!report) return;
    downloadFile(
      `the-house-hub-${tableName}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(report.tables[tableName]),
      "text/csv"
    );
  }

  function exportHtml() {
    if (!report) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>The House Hub Report</title></head><body><pre>${JSON.stringify(
      report,
      null,
      2
    )}</pre></body></html>`;
    downloadFile(
      `the-house-hub-report-${new Date().toISOString().slice(0, 10)}.html`,
      html,
      "text/html"
    );
  }

  const propertyRows = report?.tables.properties || [];
  const paymentRows = report?.tables.payments || [];

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8 dark:bg-slate-950">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-slate-700 shadow-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          Loading reports...
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      user={user}
      activeItem="reports"
      title="Reports"
      subtitle="Filter, analyze, export, email, and automate landlord portfolio reporting."
      actions={
        <button
          type="button"
          onClick={loadReports}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {(error || success) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Report Filters</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manipulate the reporting database by period, property, tenant, status, and payment method.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Field label="From">
              <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="To">
              <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Property">
              <select value={filters.propertyId} onChange={(e) => setFilters((p) => ({ ...p, propertyId: e.target.value }))} className={inputClass}>
                <option value="ALL">All properties</option>
                {report?.options.properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Tenant">
              <select value={filters.tenantId} onChange={(e) => setFilters((p) => ({ ...p, tenantId: e.target.value }))} className={inputClass}>
                <option value="ALL">All tenants</option>
                {report?.options.tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className={inputClass}>
                {paymentStatuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Method">
              <select value={filters.paymentMethod} onChange={(e) => setFilters((p) => ({ ...p, paymentMethod: e.target.value }))} className={inputClass}>
                {paymentMethods.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {report && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Revenue" value={formatMoney(report.summary.totalRevenue)} detail="Approved cash" />
              <Metric label="Pending" value={formatMoney(report.summary.pendingRevenue)} detail="Needs approval" />
              <Metric label="Occupancy" value={`${report.summary.occupancyRate}%`} detail={`${report.summary.occupiedProperties}/${report.summary.properties} properties`} />
              <Metric label="Maintenance" value={String(report.summary.maintenanceOpen)} detail="Open work items" />
              <Metric label="Rent Potential" value={formatMoney(report.summary.totalRentPotential)} detail="Monthly portfolio" />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Revenue Timeline" subtitle="Approved, pending, and rejected payments" className="xl:col-span-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.charts.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="paid" stroke="#16a34a" fill="#dcfce7" />
                      <Area type="monotone" dataKey="pending" stroke="#d97706" fill="#fef3c7" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Exports" subtitle="Download the same filtered report">
                <div className="grid gap-3">
                  <ExportButton icon={<FileSpreadsheet />} label="Payments CSV" onClick={() => exportCsv("payments")} />
                  <ExportButton icon={<FileSpreadsheet />} label="Properties CSV" onClick={() => exportCsv("properties")} />
                  <ExportButton icon={<FileJson />} label="Full JSON" onClick={exportJson} />
                  <ExportButton icon={<Download />} label="HTML Snapshot" onClick={exportHtml} />
                  <ExportButton icon={<Printer />} label="Print / Save PDF" onClick={() => window.print()} />
                </div>
              </Panel>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_.8fr]">
              <Panel title="Property Performance" subtitle="Rent collection and maintenance pressure">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.charts.propertyPerformance.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="paid" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Email & Automation" subtitle="Send now or schedule automatic landlord reports">
                <div className="space-y-4">
                  <Field label="Recipients">
                    <textarea
                      value={recipientText}
                      onChange={(e) => setRecipientText(e.target.value)}
                      className={`${inputClass} min-h-24`}
                      placeholder="owner@email.com, manager@email.com"
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={sendReport}
                      disabled={sending}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Now
                    </button>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass}>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={createSchedule}
                    disabled={scheduling}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    Create Automatic Schedule
                  </button>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">Active schedules</p>
                    <div className="mt-3 space-y-2">
                      {schedules.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No automatic report schedule yet.</p>
                      ) : (
                        schedules.slice(0, 4).map((schedule) => (
                          <div key={schedule.id} className="rounded-xl bg-white px-3 py-2 text-sm dark:bg-white/10">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-900 dark:text-white">{schedule.frequency}</span>
                              <span className="text-slate-500 dark:text-slate-400">{formatDate(schedule.nextRunAt)}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              <Mail className="mr-1 inline h-3 w-3" />
                              {schedule.recipients.join(", ")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            </section>

            <Panel title="Report Tables" subtitle="Filtered operational records">
              <div className="grid gap-6 xl:grid-cols-2">
                <DataTable title="Payments" rows={paymentRows.slice(0, 8)} />
                <DataTable title="Properties" rows={propertyRows.slice(0, 8)} />
              </div>
            </Panel>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ExportButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-blue-500/10"
    >
      <span className="inline-flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4">{icon}{label}</span>
      <Download className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function DataTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
}) {
  const columns = rows[0] ? Object.keys(rows[0]).slice(0, 5) : [];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <p className="font-bold text-slate-950 dark:text-white">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500 dark:bg-transparent dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={Math.max(columns.length, 1)}>No records found.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100 dark:border-white/10">
                  {columns.map((column) => (
                    <td key={column} className="max-w-40 truncate px-4 py-3 text-slate-700 dark:text-slate-200">
                      {String(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
