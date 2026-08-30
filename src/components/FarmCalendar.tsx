"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIsraelDate, jerusalemTodayKey } from "@/lib/herd";
import { t, type Locale, type MsgKey } from "@/lib/i18n";

type EventKind = "vaccine" | "mating" | "lambing" | "checkup1" | "checkup2";

type CalendarEvent = {
  date: string;
  kind: EventKind;
  name?: string;
  animalNumber: string;
  groupName: string;
};

type Props = {
  slug: string;
  locale: Locale;
  farmId?: string;
};

const MONTH_KEYS = [
  "month1",
  "month2",
  "month3",
  "month4",
  "month5",
  "month6",
  "month7",
  "month8",
  "month9",
  "month10",
  "month11",
  "month12",
] as const;

const WEEKDAY_KEYS = [
  "weekday1",
  "weekday2",
  "weekday3",
  "weekday4",
  "weekday5",
  "weekday6",
  "weekday7",
] as const;

const EVENT_KEYS: Record<EventKind, MsgKey> = {
  vaccine: "eventVaccine",
  mating: "eventMating",
  lambing: "eventLambing",
  checkup1: "eventCheckup1",
  checkup2: "eventCheckup2",
};

function withFarm(path: string, farmId?: string) {
  if (!farmId) return path;
  return `${path}?farmId=${encodeURIComponent(farmId)}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function FarmCalendar({ locale, farmId }: Props) {
  const router = useRouter();
  const today = jerusalemTodayKey();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withFarm("/api/breeder/calendar", farmId));
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const selectedEvents = selected ? byDate.get(selected) || [] : [];

  function eventTitle(event: CalendarEvent) {
    if (event.kind === "vaccine") {
      return t(locale, "eventVaccine", { name: event.name || "" });
    }
    return t(locale, EVENT_KEYS[event.kind]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-[var(--cream)]">
          {t(locale, "calendarTitle")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear((value) => value - 1)}
            className="rounded-xl border border-white/20 px-3 py-2 text-sm"
            aria-label={t(locale, "calendarPrevYear")}
          >
            ‹
          </button>
          <p className="min-w-16 text-center text-lg font-semibold">{year}</p>
          <button
            type="button"
            onClick={() => setYear((value) => value + 1)}
            className="rounded-xl border border-white/20 px-3 py-2 text-sm"
            aria-label={t(locale, "calendarNextYear")}
          >
            ›
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "calendarPickDay")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? <p className="mt-4">{t(locale, "loading")}</p> : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {MONTH_KEYS.map((monthKey, month) => (
          <section key={monthKey} className="surface-dark rounded-2xl p-3">
            <h2 className="mb-2 text-center font-semibold text-[var(--cream)]">
              {t(locale, monthKey)}
            </h2>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[rgba(244,239,230,0.55)]">
              {WEEKDAY_KEYS.map((key) => (
                <span key={key} className="py-1">
                  {t(locale, key)}
                </span>
              ))}
              {Array.from(
                { length: new Date(year, month, 1).getDay() },
                (_, index) => (
                  <span key={`pad-${month}-${index}`} />
                ),
              )}
              {Array.from(
                { length: new Date(year, month + 1, 0).getDate() },
                (_, index) => {
                  const day = index + 1;
                  const key = dateKey(year, month, day);
                  const hasEvents = byDate.has(key);
                  const isToday = key === today;
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      aria-label={
                        hasEvents
                          ? `${formatIsraelDate(key)} · ${t(locale, "calendarHasEvents")}`
                          : formatIsraelDate(key)
                      }
                      className={`rounded-lg py-1.5 text-sm transition ${
                        isSelected
                          ? "bg-[var(--teal)] font-semibold text-[var(--cream)]"
                          : hasEvents
                            ? "bg-[var(--hay)]/35 font-semibold text-[var(--cream)] hover:bg-[var(--hay)]/50"
                            : "text-[rgba(244,239,230,0.78)] hover:bg-white/10"
                      } ${isToday && !isSelected ? "ring-1 ring-[var(--hay)]" : ""}`}
                    >
                      {day}
                    </button>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </div>

      {selected ? (
        <section className="surface-dark mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-[var(--cream)]">
              {formatIsraelDate(selected)}
            </h2>
            {selected === today ? (
              <p className="text-sm text-[var(--hay)]">
                {t(locale, "calendarToday")}
              </p>
            ) : null}
          </div>
          {selectedEvents.length === 0 ? (
            <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "calendarNoEvents")}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {selectedEvents.map((event, index) => (
                <li
                  key={`${event.kind}-${event.animalNumber}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <p className="font-semibold">{eventTitle(event)}</p>
                  <p className="mt-1 text-sm text-[rgba(244,239,230,0.7)]">
                    {t(locale, "calendarAnimal", { number: event.animalNumber })}
                    {" · "}
                    {event.groupName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
