import type { ScheduleSlot } from "../types/config";

/** Parse "HH:MM" (24h) into minutes from midnight. Returns null if invalid. */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Next occurrence of a slot's time at or after `now` (today or tomorrow). */
export function nextOccurrence(slot: ScheduleSlot, now: Date = new Date()): Date | null {
  const totalMinutes = parseTimeToMinutes(slot.time);
  if (totalMinutes === null) return null;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes, 0, 0);

  // If the slot time has already passed this minute, schedule for tomorrow.
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

export function msUntil(date: Date, now: Date = new Date()): number {
  return Math.max(0, date.getTime() - now.getTime());
}

/** Unique key for a slot firing on a given calendar day+time (prevents double-fire). */
export function fireKey(slot: ScheduleSlot, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${slot.id}-${y}-${m}-${d}-${slot.time}`;
}

export function formatTimeInput(time: string): string {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return "08:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
