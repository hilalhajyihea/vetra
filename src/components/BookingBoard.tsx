"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLocale } from "@/components/LocaleProvider";
import { formatClock, rollingMonths } from "@/lib/booking";
import { formatIsraelDate, jerusalemTodayKey } from "@/lib/herd";
import { t, type Locale, type MsgKey } from "@/lib/i18n";

type Mine = {
  id: string;
  date: string;
  startMin: number;
  reason: string;
  status: string;
};

type Props = {
  slug: string;
  locale: Locale;
  farmId?: string;
};

const WEEKDAY_KEYS = [
  "weekday1",
  "weekday2",
  "weekday3",
  "weekday4",
  "weekday5",
  "weekday6",
  "weekday7",
] as const;

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

function withFarm(path: string, farmId?: string) {
  if (!farmId) return path;
  return `${path}?farmId=${encodeURIComponent(farmId)}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function BookingBoard({ locale: localeProp, farmId }: Props) {
  const locale = useUiLocale(localeProp);
  const router = useRouter();
  const today = jerusalemTodayKey();
  const months = useMemo(() => rollingMonths(3), []);
  const [days, setDays] = useState<Record<string, { slots: number[] }>>({});
  const [mine, setMine] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withFarm("/api/breeder/booking", farmId));
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setDays(data.days || {});
      setMine(data.mine || []);
    } catch {
      setError(t(locale, "loadError"));
    } finally {
      setLoading(false);
    }
  }, [farmId, locale, router]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSlots = selected ? days[selected]?.slots || [] : [];

  async function book(e: FormEvent) {
    e.preventDefault();
    if (!selected || slot == null || !reason.trim()) return;
    setError("");
    setMessage("");
    const res = await fetch("/api/breeder/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selected,
        startMin: slot,
        reason,
        farmId,
      }),
    });
    if (res.status === 409) {
      setError(t(locale, "bookingTaken"));
      load();
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "PAST_SLOT"
          ? t(locale, "errPastSlot")
          : t(locale, "updateFailed"),
      );
      return;
    }
    setMessage(t(locale, "bookingSaved"));
    setReason("");
    setSlot(null);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--cream)]">
        {t(locale, "bookingTitle")}
      </h1>
      <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "bookingLead")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--hay)]">{message}</p>
      ) : null}
      {loading ? <p className="mt-4">{t(locale, "loading")}</p> : null}

      {!loading && Object.keys(days).length === 0 ? (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "bookingNoDays")}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {months.map(({ year, month }) => (
          <section key={`${year}-${month}`} className="surface-dark rounded-2xl p-3">
            <h2 className="mb-2 text-center font-semibold">
              {t(locale, MONTH_KEYS[month] as MsgKey)} {year}
            </h2>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[rgba(244,239,230,0.55)]">
              {WEEKDAY_KEYS.map((key) => (
                <span key={key} className="py-1">
                  {t(locale, key)}
                </span>
              ))}
              {Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => (
                <span key={`pad-${month}-${i}`} />
              ))}
              {Array.from(
                { length: new Date(year, month + 1, 0).getDate() },
                (_, index) => {
                  const day = index + 1;
                  const key = dateKey(year, month, day);
                  const open = Boolean(days[key]?.slots.length);
                  const isSelected = key === selected;
                  const isToday = key === today;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!open}
                      onClick={() => {
                        setSelected(key);
                        setSlot(null);
                      }}
                      className={`rounded-lg py-1.5 text-sm ${
                        isSelected
                          ? "bg-[var(--teal)] font-semibold text-[var(--cream)]"
                          : open
                            ? "bg-[var(--hay)]/35 font-semibold hover:bg-[var(--hay)]/50"
                            : "text-[rgba(244,239,230,0.35)]"
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
        <form onSubmit={book} className="surface-dark mt-6 rounded-2xl p-5">
          <h2 className="font-display text-2xl">
            {formatIsraelDate(selected)}
          </h2>
          {selectedSlots.length === 0 ? (
            <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "bookingNoSlots")}
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSlots.map((startMin) => (
                  <button
                    key={startMin}
                    type="button"
                    onClick={() => setSlot(startMin)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      slot === startMin
                        ? "bg-[var(--teal)] text-[var(--cream)]"
                        : "border border-white/20"
                    }`}
                  >
                    {t(locale, "bookingSlot", {
                      from: formatClock(startMin),
                      to: formatClock(startMin + 30),
                    })}
                  </button>
                ))}
              </div>
              <textarea
                className="shop-field mt-4 min-h-24 w-full rounded-xl px-3 py-2.5"
                placeholder={t(locale, "bookingReason")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={slot == null}
                className="btn-primary mt-3 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                {t(locale, "bookingSubmit")}
              </button>
            </>
          )}
        </form>
      ) : (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "bookingPickDay")}
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl">{t(locale, "bookingMine")}</h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
            {t(locale, "bookingNoAppointments")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((item) => (
              <li
                key={item.id}
                className="surface-dark rounded-2xl px-4 py-3 text-sm"
              >
                <p className="font-semibold">
                  {formatIsraelDate(item.date)} ·{" "}
                  {t(locale, "bookingSlot", {
                    from: formatClock(item.startMin),
                    to: formatClock(item.startMin + 30),
                  })}
                </p>
                <p
                  className={`mt-1 font-semibold ${
                    item.status === "APPROVED"
                      ? "text-emerald-300"
                      : item.status === "CANCELLED"
                        ? "text-red-300"
                        : "text-[var(--hay)]"
                  }`}
                >
                  {item.status === "APPROVED"
                    ? t(locale, "bookingApproved")
                    : item.status === "CANCELLED"
                      ? t(locale, "bookingCancelled")
                      : t(locale, "bookingPending")}
                </p>
                <p className="mt-1 text-[rgba(244,239,230,0.7)]">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
