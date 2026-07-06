import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://thehousehub.app"),
  title: "The House Hub",
  description:
    "Smart property management platform for owners, admins, and tenants.",
  applicationName: "The House Hub",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "The House Hub",
    description:
      "Smart property management platform for owners, admins, and tenants.",
    url: "https://thehousehub.app",
    siteName: "The House Hub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 400,
        alt: "The House Hub",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The House Hub",
    description:
      "Smart property management platform for owners, admins, and tenants.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "18px",
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #d1fae5",
              padding: "16px",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#ffffff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#ffffff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
