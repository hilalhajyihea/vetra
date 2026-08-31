import { jerusalemTodayKey } from "@/lib/herd";

export const SLOT_MINUTES = 30;

export function formatClock(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function parseClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function slotsFromWindow(startMin: number, endMin: number) {
  const slots: number[] = [];
  for (let t = startMin; t + SLOT_MINUTES <= endMin; t += SLOT_MINUTES) {
    slots.push(t);
  }
  return slots;
}

export function clockOptions(fromMin = 6 * 60, toMin = 22 * 60) {
  const options: number[] = [];
  for (let t = fromMin; t <= toMin; t += SLOT_MINUTES) {
    options.push(t);
  }
  return options;
}

export function rollingMonths(count = 3) {
  const today = jerusalemTodayKey();
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
    };
  });
}

export function israelNowMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}
