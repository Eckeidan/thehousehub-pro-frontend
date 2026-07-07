"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;
const THEME_KEY = "thehousehub.theme";
const LEGACY_SUPER_OWNER_THEME_KEY = "thehousehub.superOwnerTheme";

const publicPaths = new Set(["/", "/login", "/auth/login"]);

async function notifyLogout(reason: string) {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // Logout must still clear the local session if the network is unavailable.
  }
}

function clearLocalSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function logoutWithServer(reason = "logout") {
  await notifyLogout(reason);
  clearLocalSession();
  window.location.href = "/";
}

export default function SessionTimeout() {
  const pathname = usePathname();
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(THEME_KEY) ||
      localStorage.getItem(LEGACY_SUPER_OWNER_THEME_KEY);

    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    if (publicPaths.has(pathname || "")) return;

    lastActivityRef.current = Date.now();

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, markActivity, { passive: true })
    );

    async function heartbeat() {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          clearLocalSession();
          window.location.href = "/";
        }
      } catch {
        // Ignore transient network failures; the next tick will retry or expire.
      }
    }

    const intervalId = window.setInterval(async () => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= INACTIVITY_LIMIT_MS) {
        await logoutWithServer("inactivity_timeout");
        return;
      }

      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatRef.current = now;
        await heartbeat();
      }
    }, 30 * 1000);

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, markActivity)
      );
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
