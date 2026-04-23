"use client";

import * as React from "react";

type SidebarLayoutValue = {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggleCollapsed: () => void;
};

const SidebarLayoutContext = React.createContext<SidebarLayoutValue | null>(
  null,
);

export function SidebarLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  return (
    <SidebarLayoutContext.Provider
      value={{ collapsed, setCollapsed, toggleCollapsed }}
    >
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout() {
  const ctx = React.useContext(SidebarLayoutContext);
  if (!ctx) {
    throw new Error("useSidebarLayout debe usarse dentro de SidebarLayoutProvider");
  }
  return ctx;
}
