import { format, formatDistanceToNowStrict } from "date-fns";

/** Les montants sont stockés en satang. 125 000 satang → "฿1,250". */
export function thb(satang: number, opts?: { decimals?: boolean }): string {
  const baht = satang / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })
    .format(baht)
    .replace("THB", "฿");
}

export function shortDate(value: string | Date): string {
  return format(new Date(value), "d MMM yyyy");
}

export function dateTime(value: string | Date): string {
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function timeOnly(value: string | Date): string {
  return format(new Date(value), "HH:mm");
}

export function fromNow(value: string | Date): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function dateRange(start: string | Date, end: string | Date): string {
  return `${shortDate(start)} → ${shortDate(end)}`;
}

/** Valeur pour un <input type="datetime-local">. */
export function toLocalInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
}
