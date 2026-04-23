import { formatInTimeZone } from "date-fns-tz";

import type { ParametersOverride } from "./validation";

const WEEKDAY_EN: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Día de semana 0=dom … 6=sáb en la zona IANA. */
export function getJsDayOfWeekInTimeZone(iso: Date, timeZone: string): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(iso);
  return WEEKDAY_EN[w] ?? 0;
}

export function getDayOfMonthInTimeZone(iso: Date, timeZone: string): number {
  return parseInt(formatInTimeZone(iso, timeZone, "d"), 10);
}

/**
 * Clave de idempotencia para no duplicar envíos en el mismo “período” (día / semana ISO / mes calendario).
 */
export function computeIdempotencyKey(
  scheduleId: string,
  timeZone: string,
  spec: ParametersOverride["schedule"],
  now: Date,
): string {
  if (spec.frequency === "daily") {
    const d = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
    return `D:${scheduleId}:${d}`;
  }
  if (spec.frequency === "weekly") {
    const y = formatInTimeZone(now, timeZone, "R");
    const w = formatInTimeZone(now, timeZone, "II");
    return `W:${scheduleId}:${y}-W${w}`;
  }
  const m = formatInTimeZone(now, timeZone, "yyyy-MM");
  return `M:${scheduleId}:${m}`;
}

/**
 * Ventana de ejecución: `true` si la hora local en `timeZone` está en [time, time + windowMin) respecto del día (o del día programado en weekly/monthly).
 */
export function isInExecutionWindow(
  now: Date,
  timeZone: string,
  timeHHmm: string,
  spec: ParametersOverride["schedule"],
  windowMin: number,
): boolean {
  const [th, tm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const targetM = th * 60 + tm;
  const cur = formatInTimeZone(now, timeZone, "HH:mm");
  const [ch, cm] = cur.split(":").map((x) => parseInt(x, 10));
  const curM = ch * 60 + cm;
  if (curM < targetM || curM >= targetM + windowMin) {
    return false;
  }
  if (spec.frequency === "daily") {
    return true;
  }
  if (spec.frequency === "weekly") {
    const want = spec.dayOfWeek ?? 0;
    return getJsDayOfWeekInTimeZone(now, timeZone) === want;
  }
  const wantDom = spec.dayOfMonth ?? 1;
  return getDayOfMonthInTimeZone(now, timeZone) === wantDom;
}
