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
  /** true = cartel oculto; false = cartel visible en el tablero */
  dismissed: boolean;
  setBannerVisible: (visible: boolean) => void;
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

  const setBannerVisible = useCallback((visible: boolean) => {
    if (visible) {
      showAgain();
    } else {
      dismiss();
    }
  }, [dismiss, showAgain]);

  const value = useMemo(
    () => ({ openHighCount, dismissed, setBannerVisible, dismiss, showAgain }),
    [openHighCount, dismissed, setBannerVisible, dismiss, showAgain],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

/**
 * Siempre visible: encendido = cartel de alertas visible; apagado = oculto (persiste en localStorage).
 */
export function DashboardAlertsHeaderAction() {
  const { dismissed, setBannerVisible } = useDashboardAlerts();
  const on = !dismissed;

  return (
    <div className="flex items-center gap-2 sm:items-center">
      <span
        className="text-muted-foreground max-w-[9rem] text-xs leading-tight sm:max-w-none sm:text-sm"
        id="tablero-alerts-toggle-label"
      >
        <span className="sm:hidden">Aviso de alertas</span>
        <span className="hidden sm:inline">Aviso de alertas en el tablero</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="tablero-alerts-toggle-label"
        title={on ? "Ocultar el aviso (podés volver a mostrarlo con el interruptor)" : "Mostrar el aviso de alertas"}
        onClick={() => setBannerVisible(!on)}
        className={cn(
          "relative inline-flex h-7 w-11 shrink-0 items-center rounded-full border shadow-sm transition-colors",
          "border-input focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          on
            ? "bg-primary/90 hover:bg-primary/80"
            : "bg-muted/50 hover:bg-muted/80",
        )}
      >
        <span
          className={cn(
            "bg-background border-border pointer-events-none block h-[22px] w-[22px] rounded-full border shadow-sm transition-transform",
            on ? "translate-x-[1.2rem]" : "translate-x-0.5",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
