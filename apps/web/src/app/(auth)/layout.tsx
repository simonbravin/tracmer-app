import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      {children}
    </div>
  );
}
