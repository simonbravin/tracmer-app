import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-muted/30 p-4">{children}</div>;
}
