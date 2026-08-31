"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { clockOptions, formatClock } from "@/lib/booking";
import { formatIsraelDate } from "@/lib/herd";
import { t, type Locale } from "@/lib/i18n";

type WindowRow = {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
};

type AppointmentRow = {
  id: string;
  date: string;
  startMin: number;
  reason: string;
  status: string;
  breeder: {
    firstName: string;
    lastName: string;
    farmName: string;
    phone: string;
  };
};

export function VetBookingPanel({ locale }: { locale: Locale }) {
  const clocks = clockOptions();
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [startMin, setStartMin] = useState(10 * 60);
  const [endMin, setEndMin] = useState(12 * 60);

  const load = useCallback(async () => {
    try {
      const [winRes, appRes] = await Promise.all([
        fetch("/api/vet/booking-windows"),
        fetch("/api/vet/appointments"),
      ]);
      const winData = await winRes.json();
      const appData = await appRes.json();
      setWindows(
        (winData.windows || []).map((item: WindowRow & { date: string | Date }) => ({
          ...item,
          date: String(item.date).slice(0, 10),
        })),
      );
      setAppointments(appData.appointments || []);
    } catch {
      setError(t(locale, "loadError"));
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  async function addWindow(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/vet/booking-windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startMin, endMin }),
    });
    if (!res.ok) {
      setError(t(locale, "errWindowInvalid"));
      return;
    }
    setDate("");
    load();
  }

  async function removeWindow(id: string) {
    setError("");
    const res = await fetch(`/api/vet/booking-windows?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  async function setAppointmentStatus(
    id: string,
    status: "APPROVED" | "CANCELLED",
  ) {
    if (
      status === "CANCELLED" &&
      !window.confirm(t(locale, "confirmCancelBooking"))
    ) {
      return;
    }
    setError("");
    const res = await fetch("/api/vet/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError(t(locale, "updateFailed"));
      return;
    }
    load();
  }

  const pending = appointments.filter((item) => item.status === "PENDING");
  const approved = appointments.filter((item) => item.status === "APPROVED");

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "bookingOpenDays")}
      </h2>
      <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "bookingOpenLead")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form onSubmit={addWindow} className="surface-dark mt-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-3">
        <label className="text-sm">
          {t(locale, "bookingWindowDate")}
          <input
            type="date"
            className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          {t(locale, "bookingWindowFrom")}
          <select
            className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            value={startMin}
            onChange={(e) => setStartMin(Number(e.target.value))}
          >
            {clocks.map((value) => (
              <option key={`s-${value}`} value={value}>
                {formatClock(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {t(locale, "bookingWindowTo")}
          <select
            className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            value={endMin}
            onChange={(e) => setEndMin(Number(e.target.value))}
          >
            {clocks.map((value) => (
              <option key={`e-${value}`} value={value}>
                {formatClock(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold sm:col-span-3"
        >
          {t(locale, "bookingAddWindow")}
        </button>
      </form>

      <h3 className="mt-6 font-semibold">{t(locale, "bookingWindowsTitle")}</h3>
      {windows.length === 0 ? (
        <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "bookingNoWindows")}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {windows.map((window) => (
            <li
              key={window.id}
              className="surface-dark flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm"
            >
              <span>
                {formatIsraelDate(window.date)} · {formatClock(window.startMin)}–
                {formatClock(window.endMin)}
              </span>
              <button
                type="button"
                onClick={() => removeWindow(window.id)}
                className="rounded-xl border border-red-400/30 px-3 py-1.5 text-red-200"
              >
                {t(locale, "deleteVaccine")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 font-display text-2xl">{t(locale, "bookingAppointments")}</h3>
      {appointments.length === 0 ? (
        <p className="mt-2 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "bookingNoAppointments")}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {[...pending, ...approved].map((item) => (
            <li key={item.id} className="surface-dark rounded-2xl px-4 py-3 text-sm">
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
                    : "text-[var(--hay)]"
                }`}
              >
                {item.status === "APPROVED"
                  ? t(locale, "bookingApproved")
                  : t(locale, "bookingPending")}
              </p>
              <p className="mt-1 text-[rgba(244,239,230,0.7)]">
                {item.breeder.firstName} {item.breeder.lastName} · {item.breeder.farmName}{" "}
                · {item.breeder.phone}
              </p>
              <p className="mt-1">{item.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "PENDING" ? (
                  <button
                    type="button"
                    className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                    onClick={() => setAppointmentStatus(item.id, "APPROVED")}
                  >
                    {t(locale, "bookingApprove")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-xl border border-red-400/30 px-4 py-2 text-sm text-red-200"
                  onClick={() => setAppointmentStatus(item.id, "CANCELLED")}
                >
                  {t(locale, "bookingCancel")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
