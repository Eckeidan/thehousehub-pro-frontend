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
    email?: string;
    role?: string;
  };
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: LoginResponse = {};

      if (contentType.includes("application/json")) {
        data = await res.json();
        console.log("LOGIN RESPONSE:", data);
        console.log("ROLE FOUND:", data?.user?.role);
        console.log("TOKEN FOUND:", data?.token);
      } else {
        const rawText = await res.text();
        console.error("Non-JSON login response:", rawText);
        setError("Backend returned an invalid response. Check auth route or backend server.");
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

      setSuccess("Login successful.");

      setTimeout(() => {
        if (role === "admin") {
          window.location.href = "/dashboard";
          return;
        }

        if (role === "owner") {
          window.location.href = "/owner";
          return;
        }

        if (role === "tenant") {
          window.location.href = "/tenant";
          return;
        }

        window.location.href = "/dashboard";
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
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-2xl lg:grid-cols-2">
          <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-10 text-white">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">The House Hub</h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100/80">
                Smart property management platform for owners, admins, and tenants.
                Manage properties, units, leases, payments, and maintenance in one place.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">Owners / Admins</p>
                <p className="mt-1 text-sm text-blue-100/70">
                  Access the full dashboard, portfolio stats, tenants, units,
                  maintenance, reports, documents, and settings.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">Tenants</p>
                <p className="mt-1 text-sm text-blue-100/70">
                  Access your tenant space, lease information, payments, and
                  maintenance requests.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">The House Hub</p>
                <p className="mt-1 text-sm text-blue-100/70">
                  Built for a premium property management experience.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Image
                      src="/The_HouseHub_Logo.png"
                      alt="The House Hub Logo"
                      width={320}
                      height={100}
                      className="h-auto w-auto max-w-[320px]"
                      priority
                    />
                  </div>
                </div>

                <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                  Sign in
                </h2>
                <p className="mt-3 text-base text-slate-500">
                  Enter your credentials to access The House Hub workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@propertyos.com"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Lock size={18} className="text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <p className="font-medium text-slate-700">Role-based access</p>
                <p className="mt-1">
                  Admin goes to dashboard, owner goes to owner space,
                  tenant goes to tenant portal.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}