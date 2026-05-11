"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  redirectTo?: string;
  user?: {
    id: string;
    name?: string;
    fullName?: string;
    email?: string;
    role?: string;
    organizationId?: string;
    tenantId?: string;
  };
  error?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: LoginResponse = {};

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        setError("Backend returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || data.message || "Login failed.");
        setLoading(false);
        return;
      }

      if (!data?.token || !data?.user) {
        setError("Invalid login response from server.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const role = String(data.user.role || "").trim().toLowerCase();

      setSuccess("Login successful. Redirecting...");

      setTimeout(() => {
        if (role === "admin") window.location.href = "/dashboard";
        else if (role === "owner") window.location.href = "/owner";
        else if (role === "tenant") window.location.href = "/tenant";
        else window.location.href = "/dashboard";
      }, 300);
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Unable to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
      <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl lg:grid-cols-2">
          <section className="hidden flex-col justify-between bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-8 text-white lg:flex xl:p-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                The House Hub
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/80">
                Smart property management platform for owners, admins, and
                tenants. Manage properties, units, leases, payments, and
                maintenance in one place.
              </p>
            </div>

            <div className="space-y-4">
              {[
                ["Landload / Admins", "Access the full dashboard, portfolio stats, tenants, units, maintenance, reports, documents, and settings."],
                ["Tenants", "Access your tenant space, lease information, payments, and maintenance requests."],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-blue-100/70">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-[100dvh] items-center justify-center bg-white px-4 py-8 sm:min-h-0 sm:px-8 sm:py-10 lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-6 text-center sm:mb-8">
                <div className="mb-5 flex justify-center sm:mb-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
                    <Image
                      src="/The_HouseHub_Logo.png"
                      alt="The House Hub Logo"
                      width={320}
                      height={100}
                      className="h-auto w-auto max-w-[220px] sm:max-w-[280px] md:max-w-[320px]"
                      priority
                    />
                  </div>
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Sign in
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                  Enter your credentials to access The House Hub workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <Mail size={18} className="shrink-0 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@propertyos.com"
                      className="w-full min-w-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <Lock size={18} className="shrink-0 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full min-w-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}