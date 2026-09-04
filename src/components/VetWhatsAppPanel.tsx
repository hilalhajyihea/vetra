"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLocale } from "@/components/LocaleProvider";
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
  locale: localeProp,
  clinicName,
  displayName,
  breeders,
}: Props) {
  const locale = useUiLocale(localeProp);
  const clinic = clinicName || displayName;
  const [text, setText] = useState(() => t(locale, "waDefaultText"));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [limit, setLimit] = useState(0);
  const [used, setUsed] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [ready, setReady] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/vet/whatsapp/send");
      const send = await res.json().catch(() => ({}));
      if (typeof send.configured === "boolean") setConfigured(send.configured);
      if (typeof send.enabled === "boolean") setEnabled(send.enabled);
      if (typeof send.limit === "number") setLimit(send.limit);
      if (typeof send.used === "number") setUsed(send.used);
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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

  function resultError(code?: string) {
    if (code === "QUOTA") return t(locale, "waQuotaHit");
    if (code === "DISABLED") return t(locale, "waDisabled");
    return code || t(locale, "waSendFailed");
  }

  async function send(body: { breederIds?: string[] }) {
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
      if (data.error === "DISABLED") {
        setEnabled(false);
        setError(t(locale, "waDisabled"));
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
      await loadStatus();
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

  if (!ready || !enabled) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "waTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "waLead")}
      </p>
      <p className="mt-2 text-sm text-[var(--hay)]">
        {t(locale, "waQuotaLine", { used, limit })}
      </p>
      {!configured ? (
        <p className="mt-2 text-sm text-red-200">{t(locale, "waNotConfigured")}</p>
      ) : null}

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
        disabled={!breeders.length || sending || used >= limit}
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
              {item.ok ? "" : ` — ${resultError(item.error)}`}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
