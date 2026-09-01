"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toWhatsAppDigits, whatsappChatHref } from "@/lib/phone";
import { t, type Locale } from "@/lib/i18n";
import { fillWhatsAppTemplate, insertPlaceholder } from "@/lib/whatsapp";

type BreederRow = {
  id: string;
  firstName: string;
  lastName: string;
  farmName: string;
  phone: string;
};

type Props = {
  locale: Locale;
  clinicName: string | null;
  displayName: string;
  breeders: BreederRow[];
};

export function VetWhatsAppPanel({
  locale,
  clinicName,
  displayName,
  breeders,
}: Props) {
  const clinic = clinicName || displayName;
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [text, setText] = useState(() => t(locale, "waDefaultText"));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [queueIndex, setQueueIndex] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/vet/profile");
      const data = await res.json();
      const next = data.phone || "";
      setPhone(next);
      setSavedPhone(next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const chosen = useMemo(
    () => breeders.filter((b) => selected[b.id]),
    [breeders, selected],
  );
  const sendable = useMemo(
    () => chosen.filter((b) => toWhatsAppDigits(b.phone)),
    [chosen],
  );

  const queue = queueIndex !== null ? sendable : [];
  const current = queueIndex !== null ? queue[queueIndex] : null;
  const previewTarget = current || chosen[0] || breeders[0];

  function varsFor(row: BreederRow | undefined) {
    if (!row) {
      return { name: "", farm: "", clinic };
    }
    return {
      name: row.firstName,
      farm: row.farmName,
      clinic,
    };
  }

  const preview = previewTarget
    ? fillWhatsAppTemplate(text, varsFor(previewTarget))
    : text;

  function toggle(id: string) {
    setQueueIndex(null);
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll() {
    setQueueIndex(null);
    const next: Record<string, boolean> = {};
    for (const b of breeders) next[b.id] = true;
    setSelected(next);
  }

  function clearSelection() {
    setQueueIndex(null);
    setSelected({});
  }

  async function savePhone(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/vet/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        data.error === "PHONE_INVALID"
          ? t(locale, "errPhoneInvalid")
          : t(locale, "updateFailed"),
      );
      return;
    }
    setPhone(data.phone || "");
    setSavedPhone(data.phone || "");
    setMessage(t(locale, "waPhoneSaved"));
  }

  function openChat(row: BreederRow, body: string) {
    const href = whatsappChatHref(row.phone, body);
    if (!href) {
      setError(t(locale, "waInvalidPhone"));
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function startQueue() {
    setError("");
    setMessage("");
    if (!sendable.length) {
      setError(
        chosen.length
          ? t(locale, "waInvalidPhone")
          : t(locale, "waNeedSelection"),
      );
      return;
    }
    if (!text.trim()) {
      setError(t(locale, "waNeedText"));
      return;
    }
    setQueueIndex(0);
  }

  function sendCurrent() {
    if (!current) return;
    openChat(current, fillWhatsAppTemplate(text, varsFor(current)));
  }

  function nextInQueue() {
    if (queueIndex === null) return;
    if (queueIndex + 1 >= queue.length) {
      setQueueIndex(null);
      setMessage(t(locale, "waDone"));
      return;
    }
    setQueueIndex(queueIndex + 1);
  }

  function testSelf() {
    setError("");
    if (!savedPhone) {
      setError(t(locale, "waTestNeedPhone"));
      return;
    }
    openChat(
      {
        id: "self",
        firstName: displayName,
        lastName: "",
        farmName: clinic,
        phone: savedPhone,
      },
      fillWhatsAppTemplate(text || t(locale, "waDefaultText"), {
        name: displayName,
        farm: clinic,
        clinic,
      }),
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "waTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "waLead")}
      </p>
      <p className="mt-2 text-sm text-[var(--hay)]">
        {savedPhone
          ? t(locale, "waFromHint", { phone: savedPhone })
          : t(locale, "waFromMissing")}
      </p>

      <form
        onSubmit={savePhone}
        className="mt-4 flex flex-wrap items-end gap-2"
      >
        <label className="min-w-48 flex-1 text-xs">
          {t(locale, "waPhoneLabel")}
          <input
            className="shop-field mt-1 w-full rounded-xl px-3 py-2.5"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xxxxxxxx"
            dir="ltr"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm"
        >
          {t(locale, "waPhoneSave")}
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm"
          onClick={testSelf}
        >
          {t(locale, "waTest")}
        </button>
      </form>
      <p className="mt-2 text-xs text-[rgba(244,239,230,0.5)]">
        {t(locale, "waPhoneHint")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-[var(--hay)]">{message}</p>
      ) : null}

      <label className="mt-5 block text-sm font-semibold">
        {t(locale, "waMessage")}
        <textarea
          className="shop-field mt-2 min-h-28 w-full rounded-xl px-3 py-2.5 text-sm"
          value={text}
          onChange={(e) => {
            setQueueIndex(null);
            setText(e.target.value);
          }}
        />
      </label>
      <p className="mt-2 text-xs text-[rgba(244,239,230,0.5)]">
        {t(locale, "waPlaceholders")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["{שם}", "{חווה}", "{קליניקה}"] as const).map((token) => (
          <button
            key={token}
            type="button"
            className="rounded-lg border border-white/15 px-2.5 py-1 text-xs"
            onClick={() => {
              setQueueIndex(null);
              setText((prev) => insertPlaceholder(prev, token));
            }}
          >
            {token}
          </button>
        ))}
      </div>

      {previewTarget ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-semibold text-[var(--hay)]">
            {t(locale, "waPreview")}
            {previewTarget
              ? ` · ${previewTarget.firstName} ${previewTarget.lastName}`
              : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{preview}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "waPreviewEmpty")}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="shop-chip rounded-xl px-3 py-1.5 text-sm"
          onClick={selectAll}
        >
          {t(locale, "waSelectAll")}
        </button>
        <button
          type="button"
          className="shop-chip rounded-xl px-3 py-1.5 text-sm"
          onClick={clearSelection}
        >
          {t(locale, "waClear")}
        </button>
        <span className="text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "waSelectedCount", { count: chosen.length })}
        </span>
      </div>

      {breeders.length === 0 ? (
        <p className="mt-3 text-sm text-[rgba(244,239,230,0.62)]">
          {t(locale, "waNoApproved")}
        </p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
          {breeders.map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected[b.id]}
                  onChange={() => toggle(b.id)}
                />
                <span className="flex-1">
                  <span className="font-semibold">
                    {b.firstName} {b.lastName}
                  </span>
                  <span className="ms-2 text-[rgba(244,239,230,0.62)]">
                    {b.farmName} · {b.phone}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {current ? (
        <div className="mt-5 rounded-2xl border border-[var(--hay)]/40 p-4">
          <p className="text-sm font-semibold">
            {t(locale, "waProgress", {
              current: queueIndex! + 1,
              total: queue.length,
              name: `${current.firstName} ${current.lastName}`,
            })}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[rgba(244,239,230,0.8)]">
            {fillWhatsAppTemplate(text, varsFor(current))}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={sendCurrent}
            >
              {t(locale, "waOpenChat")}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              onClick={nextInQueue}
            >
              {queueIndex! + 1 >= queue.length
                ? t(locale, "waFinish")
                : t(locale, "waNext")}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm"
              onClick={() => setQueueIndex(null)}
            >
              {t(locale, "waCancelQueue")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary mt-5 rounded-xl px-4 py-2 text-sm font-semibold"
          onClick={startQueue}
          disabled={!breeders.length}
        >
          {t(locale, "waStart")}
        </button>
      )}
    </section>
  );
}
