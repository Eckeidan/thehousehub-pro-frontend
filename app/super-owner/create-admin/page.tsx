"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import SuperOwnerShell from "@/components/SuperOwnerShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StoredUser = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type PermissionsResponse = {
  accessAll: boolean;
  permissions: string[];
  availablePermissions: string[];
};

const permissionDescriptions: Record<string, string> = {
  "organizations:read": "Voir toutes les organisations et leurs informations.",
  "properties:read": "Inspecter les propriétés des organisations.",
  "tenants:read": "Voir les tenants des organisations.",
  "transactions:read": "Lire les paiements et transactions du système.",
  "audit:read": "Consulter les événements d'audit.",
  "support:read": "Voir les demandes et contextes de support.",
  "support:suspend_user": "Suspendre un utilisateur d'une organisation.",
  "support:reactivate_user": "Réactiver un utilisateur suspendu.",
  "super_owner:create": "Créer d'autres Super Owners.",
};

export default function CreateSuperOwnerPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    temporaryPassword: "",
    platformAccessAll: false,
    platformPermissions: [] as string[],
  });

  const canCreate = useMemo(
    () =>
      permissions?.accessAll === true ||
      permissions?.permissions?.includes("super_owner:create") ||
      permissions?.permissions?.includes("*"),
    [permissions]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(userRaw);
      if (String(parsedUser.role || "").toUpperCase() !== "SUPER_OWNER") {
        router.replace("/");
        return;
      }
      setUser(parsedUser);
      setCheckingAuth(false);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const apiFetch = useCallback(async <TData,>(path: string): Promise<TData> => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
      throw new Error("Unauthorized");
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as TData;
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    async function loadPermissions() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch<PermissionsResponse>("/api/super-owner/permissions");
        setPermissions(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load permissions.");
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [apiFetch, checkingAuth]);

  function togglePermission(permission: string) {
    setForm((current) => {
      const exists = current.platformPermissions.includes(permission);
      return {
        ...current,
        platformPermissions: exists
          ? current.platformPermissions.filter((item) => item !== permission)
          : [...current.platformPermissions, permission],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canCreate) {
      setError("Missing permission: super_owner:create");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/super-owner/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to create Super Owner.");

      setMessage("Super Owner account created. The user must change the temporary password at first login.");
      setForm({
        fullName: "",
        email: "",
        temporaryPassword: "",
        platformAccessAll: false,
        platformPermissions: [],
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create Super Owner.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading creation workspace...
      </main>
    );
  }

  const visiblePermissions = (permissions?.availablePermissions || []).filter(
    (permission) => permission !== "super_owner:create" || permissions?.accessAll
  );

  return (
    <SuperOwnerShell
      user={user}
      activeItem="create-admin"
      title="Create Admin"
      subtitle="Créer un autre Super Owner et lui attribuer seulement les responsabilités nécessaires."
    >
      <div className="grid gap-6 xl:grid-cols-[0.36fr_0.64fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <ShieldCheck size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
            Responsibility Model
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Access = SUPER_OWNER role plus explicit ABAC permissions. Use full platform access only for trusted root administrators.
          </p>

          <div className="mt-6 space-y-3">
            <InfoRow label="Role" value="SUPER_OWNER" />
            <InfoRow label="Default Login" value="Must change password" />
            <InfoRow label="Access Rule" value="Least privilege" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl dark:shadow-black/20">
          {error && (
            <div className="mb-5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              {message}
            </div>
          )}

          {!canCreate ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <p className="font-bold text-slate-950 dark:text-white">No creation permission</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your account needs super_owner:create to create another platform admin.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  icon={<Users size={16} />}
                  label="Full Name"
                  value={form.fullName}
                  onChange={(value) => setForm((current) => ({ ...current, fullName: value }))}
                />
                <InputField
                  icon={<Mail size={16} />}
                  type="email"
                  label="Email"
                  value={form.email}
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                />
                <InputField
                  icon={<KeyRound size={16} />}
                  type="password"
                  label="Temporary Password"
                  value={form.temporaryPassword}
                  onChange={(value) => setForm((current) => ({ ...current, temporaryPassword: value }))}
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <input
                  type="checkbox"
                  checked={form.platformAccessAll}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      platformAccessAll: event.target.checked,
                      platformPermissions: event.target.checked ? [] : current.platformPermissions,
                    }))
                  }
                  disabled={!permissions?.accessAll}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-950 dark:text-white">
                    Platform root access
                  </span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    Grants all current and future platform permissions. Only a root Super Owner can grant this.
                  </span>
                </span>
              </label>

              {!form.platformAccessAll && (
                <div>
                  <p className="mb-3 text-sm font-bold text-slate-950 dark:text-white">
                    Responsibilities
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visiblePermissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <input
                          type="checkbox"
                          checked={form.platformPermissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-950 dark:text-white">
                            {permission}
                          </span>
                          <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {permissionDescriptions[permission] || "ABAC platform responsibility"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={16} />}
                  {submitting ? "Creating..." : "Create Super Owner"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </SuperOwnerShell>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-950 dark:text-white">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 ${
            icon ? "pl-10" : ""
          }`}
          required
        />
      </span>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
