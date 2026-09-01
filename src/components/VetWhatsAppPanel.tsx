"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { fillWhatsAppTemplate, insertPlaceholder } from "@/lib/whatsapp";

type BreederRow = {
  id: string;
  firstName: string;
  lastName: string;
  farmName: string;
  phone: string;
};

type SendResult = {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
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
  const [text, setText] = useState(() => t(locale, "waDefaultText"));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [results, setResults] = useState<SendResult[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, sendRes] = await Promise.all([
        fetch("/api/vet/profile"),
        fetch("/api/vet/whatsapp/send"),
      ]);
      const profile = await profileRes.json();
      const send = await sendRes.json().catch(() => ({}));
      setPhone(profile.phone || "");
      if (typeof send.configured === "boolean") setConfigured(send.configured);
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
  const previewTarget = chosen[0] || breeders[0];

  function varsFor(row: BreederRow | undefined) {
    if (!row) return { name: "", farm: "", clinic };
    return { name: row.firstName, farm: row.farmName, clinic };
  }

  const preview = previewTarget
    ? fillWhatsAppTemplate(text, varsFor(previewTarget))
    : text;

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    for (const b of breeders) next[b.id] = true;
    setSelected(next);
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
    setMessage(t(locale, "waPhoneSaved"));
  }

  async function send(body: { breederIds?: string[]; testSelf?: boolean }) {
    setError("");
    setMessage("");
    setResults([]);
    setSending(true);
    try {
      const res = await fetch("/api/vet/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 || data.error === "NOT_CONFIGURED") {
        setConfigured(false);
        setError(t(locale, "waNotConfigured"));
        return;
      }
      if (data.error === "PHONE_MISSING") {
        setError(t(locale, "waTestNeedPhone"));
        return;
      }
      if (!res.ok) {
        setError(t(locale, "waSendFailed"));
        return;
      }
      const list: SendResult[] = data.results || [];
      setResults(list);
      const ok = list.filter((item) => item.ok).length;
      setMessage(t(locale, "waSendResult", { ok, total: list.length }));
    } catch {
      setError(t(locale, "waSendFailed"));
    } finally {
      setSending(false);
    }
  }

  function startSend() {
    if (!chosen.length) {
      setError(t(locale, "waNeedSelection"));
      return;
    }
    if (!text.trim()) {
      setError(t(locale, "waNeedText"));
      return;
    }
    send({ breederIds: chosen.map((b) => b.id) });
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "waTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "waLead")}
      </p>
      {!configured ? (
        <p className="mt-2 text-sm text-red-200">{t(locale, "waNotConfigured")}</p>
      ) : null}

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
          onClick={() => send({ testSelf: true })}
          disabled={sending}
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
          onChange={(e) => setText(e.target.value)}
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
            onClick={() => setText((prev) => insertPlaceholder(prev, token))}
          >
            {token}
          </button>
        ))}
      </div>

      {previewTarget ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-semibold text-[var(--hay)]">
            {t(locale, "waPreview")}
            {` · ${previewTarget.firstName} ${previewTarget.lastName}`}
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
          onClick={() => setSelected({})}
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

      <button
        type="button"
        className="btn-primary mt-5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        onClick={startSend}
        disabled={!breeders.length || sending}
      >
        {sending ? t(locale, "waSending") : t(locale, "waStart")}
      </button>

      {results.length ? (
        <ul className="mt-4 space-y-1 text-sm">
          {results.map((item) => (
            <li
              key={item.id}
              className={item.ok ? "text-emerald-200" : "text-red-200"}
            >
              {item.name}
              {item.ok ? "" : ` — ${item.error || t(locale, "waSendFailed")}`}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
