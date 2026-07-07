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
  settings?: {
    companyName?: string | null;
    email?: string | null;
    supportEmail?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
  } | null;
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

function resolveAssetUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReportHtml(report: ReportPayload) {
  const company =
    report.settings?.companyName ||
    report.organization?.companyName ||
    report.organization?.name ||
    "The House Hub";
  const logoUrl = resolveAssetUrl(report.settings?.logoUrl);
  const from = report.filters.from ? formatDate(report.filters.from) : "All time";
  const to = report.filters.to ? formatDate(report.filters.to) : "Today";
  const properties = report.tables.properties
    .slice(0, 16)
    .map(
      (property) => `
      <tr>
        <td>${escapeHtml(property.name || property.code || "N/A")}</td>
        <td>${escapeHtml([property.city, property.state].filter(Boolean).join(", ") || "N/A")}</td>
        <td>${escapeHtml(property.tenants)}</td>
        <td>${escapeHtml(formatMoney(property.monthlyRent))}</td>
        <td>${escapeHtml(formatMoney(property.paid))}</td>
      </tr>`
    )
    .join("");
  const payments = report.tables.payments
    .slice(0, 24)
    .map(
      (payment) => `
      <tr>
        <td>${escapeHtml(formatDate(String(payment.date || "")))}</td>
        <td>${escapeHtml(payment.tenant || "N/A")}</td>
        <td>${escapeHtml(payment.property || "N/A")}</td>
        <td>${escapeHtml(formatMoney(payment.amount))}</td>
        <td><span class="status">${escapeHtml(payment.status)}</span></td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(company)} Portfolio Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef3f8; color: #0f172a; font-family: Arial, sans-serif; }
    .page { max-width: 1040px; margin: 32px auto; background: white; border: 1px solid #dbe4ef; border-radius: 28px; overflow: hidden; box-shadow: 0 24px 70px rgba(15,23,42,.12); }
    .header { background: #0f172a; color: white; padding: 34px; display: flex; justify-content: space-between; gap: 28px; }
    .logo { height: 58px; max-width: 190px; object-fit: contain; background: white; border-radius: 16px; padding: 8px; margin-bottom: 18px; }
    .mark { height: 58px; width: 58px; display: grid; place-items: center; background: #2563eb; border-radius: 18px; font-weight: 900; margin-bottom: 18px; }
    .eyebrow { margin: 0; color: #93c5fd; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 10px 0 0; font-size: 36px; line-height: 1.05; }
    .meta { color: #cbd5e1; font-size: 13px; text-align: right; line-height: 1.7; }
    .body { padding: 34px; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
    .metric span { display: block; color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 10px; font-size: 24px; }
    .summary { margin-top: 28px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 22px; color: #475569; line-height: 1.65; }
    h2 { margin: 32px 0 14px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding: 11px 8px; }
    td { border-bottom: 1px solid #edf2f7; padding: 13px 8px; color: #1e293b; }
    .status { display: inline-block; border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 4px 9px; font-size: 11px; font-weight: 800; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 34px; color: #64748b; font-size: 12px; }
    @media print { body { background: white; } .page { margin: 0; border-radius: 0; box-shadow: none; border: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company)} logo">` : `<div class="mark">HH</div>`}
        <p class="eyebrow">Landlord Portfolio Report</p>
        <h1>${escapeHtml(company)}</h1>
        <p style="margin: 12px 0 0; color: #cbd5e1;">Reporting period: ${escapeHtml(from)} - ${escapeHtml(to)}</p>
      </div>
      <div class="meta">
        <strong style="color:white;">Generated</strong><br>${escapeHtml(formatDate(report.generatedAt))}<br><br>
        <strong style="color:white;">Organization</strong><br>${escapeHtml(report.organization?.email || report.settings?.email || "N/A")}<br><br>
        <strong style="color:white;">Support</strong><br>${escapeHtml(report.settings?.supportEmail || report.settings?.email || "N/A")}
      </div>
    </header>
    <section class="body">
      <div class="metrics">
        <div class="metric"><span>Revenue</span><strong>${escapeHtml(formatMoney(report.summary.totalRevenue))}</strong></div>
        <div class="metric"><span>Pending</span><strong>${escapeHtml(formatMoney(report.summary.pendingRevenue))}</strong></div>
        <div class="metric"><span>Occupancy</span><strong>${report.summary.occupancyRate}%</strong></div>
        <div class="metric"><span>Maintenance</span><strong>${report.summary.maintenanceOpen}</strong></div>
      </div>
      <div class="summary">
        This report summarizes ${report.summary.properties} active properties, ${report.summary.tenants} tenants,
        ${escapeHtml(formatMoney(report.summary.totalRevenue))} approved revenue, and ${report.summary.maintenanceOpen}
        open maintenance request(s). All data is scoped to the current landlord organization and selected filters.
      </div>
      <h2>Property Performance</h2>
      <table>
        <thead><tr><th>Property</th><th>Market</th><th>Tenants</th><th>Monthly Rent</th><th>Collected</th></tr></thead>
        <tbody>${properties || `<tr><td colspan="5">No properties found.</td></tr>`}</tbody>
      </table>
      <h2>Payment Activity</h2>
      <table>
        <thead><tr><th>Date</th><th>Tenant</th><th>Property</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${payments || `<tr><td colspan="5">No payments found.</td></tr>`}</tbody>
      </table>
    </section>
    <footer class="footer">Generated by The House Hub. Report filters and exported figures are included in the JSON export for auditability.</footer>
  </main>
</body>
</html>`;
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
    downloadFile(
      `the-house-hub-report-${new Date().toISOString().slice(0, 10)}.html`,
      buildReportHtml(report),
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

        {report && <ReportLetterhead report={report} />}

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

function ReportLetterhead({ report }: { report: ReportPayload }) {
  const company =
    report.settings?.companyName ||
    report.organization?.companyName ||
    report.organization?.name ||
    "The House Hub";
  const logoUrl = resolveAssetUrl(report.settings?.logoUrl);
  const from = report.filters.from ? formatDate(report.filters.from) : "All time";
  const to = report.filters.to ? formatDate(report.filters.to) : "Today";

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-white/10">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-8">
        <div>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${company} logo`}
              className="mb-5 h-16 max-w-56 rounded-2xl bg-white object-contain p-2"
            />
          ) : (
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black">
              HH
            </div>
          )}
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
            Landlord Portfolio Report
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {company}
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            Reporting period: {from} - {to}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          <LetterheadMeta label="Generated" value={formatDate(report.generatedAt)} />
          <LetterheadMeta
            label="Organization"
            value={report.organization?.email || report.settings?.email || "N/A"}
          />
          <LetterheadMeta
            label="Support"
            value={report.settings?.supportEmail || report.settings?.email || "N/A"}
          />
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-white/5 p-4 sm:grid-cols-4 lg:px-8">
        <LetterheadMetric label="Approved Revenue" value={formatMoney(report.summary.totalRevenue)} />
        <LetterheadMetric label="Pending Revenue" value={formatMoney(report.summary.pendingRevenue)} />
        <LetterheadMetric label="Occupancy" value={`${report.summary.occupancyRate}%`} />
        <LetterheadMetric label="Open Maintenance" value={String(report.summary.maintenanceOpen)} />
      </div>
    </section>
  );
}

function LetterheadMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function LetterheadMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
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
