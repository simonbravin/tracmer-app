"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "tracmer:tablero:banner-alertas:oculto";

type AlertsContextValue = {
  openHighCount: number;
  dismissed: boolean;
  dismiss: () => void;
  showAgain: () => void;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function useDashboardAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useDashboardAlerts debe usarse dentro de DashboardAlertsProvider");
  }
  return ctx;
}

export function DashboardAlertsProvider({
  openHighCount,
  children,
}: {
  openHighCount: number;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  }, []);

  const showAgain = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
    setDismissed(false);
  }, []);

  const value = useMemo(
    () => ({ openHighCount, dismissed, dismiss, showAgain }),
    [openHighCount, dismissed, dismiss, showAgain],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

/**
 * Toggle compacto alineado con el título (vía `PageHeader` `actions`).
 * Solo si hay alertas altas/críticas abiertas y el usuario cerró el cartel.
 */
export function DashboardAlertsHeaderAction() {
  const { openHighCount, dismissed, showAgain } = useDashboardAlerts();

  if (openHighCount <= 0 || !dismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 sm:items-center">
      <span className="text-muted-foreground text-xs leading-tight sm:text-sm">
        <span className="sm:hidden">Mostrar aviso</span>
        <span className="hidden sm:inline">Mostrar aviso de alertas</span>
      </span>
      <button
        type="button"
        aria-label="Mostrar el cartel de alertas en el tablero"
        title="Mostrar de nuevo el aviso de alertas"
        onClick={showAgain}
        className={cn(
          "border-input bg-muted/50 relative inline-flex h-7 w-11 shrink-0 items-center rounded-full border shadow-sm",
          "transition-colors hover:bg-muted/80",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
      >
        <span
          className="bg-background border-border pointer-events-none block h-[22px] w-[22px] translate-x-0.5 rounded-full border shadow-sm"
          aria-hidden
        />
      </button>
    </div>
  );
}
