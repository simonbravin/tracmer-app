import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { auth } from "@/auth";
import { AppProviders } from "@/components/providers/app-providers";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Tracmer",
    template: "%s · Tracmer",
  },
  description:
    "Control administrativo y financiero para empresas de transporte (no TMS).",
  icons: {
    icon: [{ url: "/brand/tracmer-truck.svg", type: "image/svg+xml" }],
    apple: "/brand/tracmer-truck.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-dvh bg-background font-sans antialiased`}
      >
        <AuthSessionProvider session={session}>
          <AppProviders>{children}</AppProviders>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
