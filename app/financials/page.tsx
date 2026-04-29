"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FinancialsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/payments");
    }, 500); // petit delay

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-2xl bg-white px-6 py-4 shadow">
        Redirecting to Financials...
      </div>
    </div>
  );
}