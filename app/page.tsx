"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    window.location.href = "/site/index.html";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-700">
      Loading The House Hub...
    </div>
  );
}