"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiLocale } from "@/components/LocaleProvider";
import { t, type Locale } from "@/lib/i18n";

type Thread = {
  id: string;
  phone: string;
  name: string;
  farmName: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  lastPreview: string;
  unreadCount: number;
  windowOpen: boolean;
};

type Message = {
  id: string;
  direction: string;
  body: string;
  createdAt: string;
};

type Props = {
  locale: Locale;
};

function formatWhen(locale: Locale, iso: string) {
  return new Date(iso).toLocaleString(locale === "ar" ? "ar" : "he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VetWhatsAppInbox({ locale: localeProp }: Props) {
  const locale = useUiLocale(localeProp);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (threadId = selectedId, silent = false) => {
      try {
        const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : "";
        const res = await fetch(`/api/vet/whatsapp/inbox${qs}`);
        const data = await res.json().catch(() => ({}));
        if (typeof data.enabled === "boolean") setEnabled(data.enabled);
        setThreads(data.threads || []);
        if (threadId) setMessages(data.messages || []);
        if (!silent) setError("");
      } catch {
        if (!silent) setError(t(locale, "loadError"));
      } finally {
        setReady(true);
      }
    },
    [locale, selectedId],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      load(selectedId, true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load, selectedId]);

  const selected = threads.find((row) => row.id === selectedId);

  async function openThread(id: string) {
    setSelectedId(id);
    setDraft("");
    setError("");
    await load(id);
  }

  async function reply() {
    if (!selected) return;
    if (!draft.trim()) {
      setError(t(locale, "inboxNeedText"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/vet/whatsapp/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selected.id, body: draft.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error === "WINDOW_CLOSED") {
        setError(t(locale, "inboxWindowClosed"));
        await load(selected.id);
        return;
      }
      if (data.error === "QUOTA") {
        setError(t(locale, "waQuotaHit"));
        return;
      }
      if (data.error === "DISABLED") {
        setEnabled(false);
        return;
      }
      if (!res.ok) {
        setError(data.error || t(locale, "waSendFailed"));
        return;
      }
      setDraft("");
      await load(selected.id);
    } catch {
      setError(t(locale, "waSendFailed"));
    } finally {
      setSending(false);
    }
  }

  if (!ready || !enabled) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-[var(--cream)]">
        {t(locale, "inboxTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(244,239,230,0.62)]">
        {t(locale, "inboxLead")}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <ul className="max-h-[28rem] space-y-2 overflow-auto">
          {threads.length === 0 ? (
            <li className="text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "inboxEmpty")}
            </li>
          ) : (
            threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-start text-sm ${
                    selectedId === thread.id
                      ? "border-[var(--hay)] bg-white/10"
                      : "border-white/10 bg-black/15"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{thread.name}</span>
                    {thread.unreadCount > 0 ? (
                      <span className="rounded-full bg-[var(--hay)] px-2 py-0.5 text-xs font-semibold text-black">
                        {thread.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-[rgba(244,239,230,0.62)]">
                    {thread.farmName || thread.phone}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[rgba(244,239,230,0.5)]">
                    {thread.lastPreview}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="surface-dark flex min-h-[22rem] flex-col rounded-2xl p-4">
          {!selected ? (
            <p className="m-auto text-sm text-[rgba(244,239,230,0.62)]">
              {t(locale, "inboxPick")}
            </p>
          ) : (
            <>
              <div className="border-b border-white/10 pb-3">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-sm text-[rgba(244,239,230,0.62)]">
                  {selected.farmName
                    ? `${selected.farmName} · ${selected.phone}`
                    : selected.phone}
                </p>
              </div>
              <ul className="mt-3 flex-1 space-y-2 overflow-auto">
                {messages.map((msg) => (
                  <li
                    key={msg.id}
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      msg.direction === "OUT"
                        ? "ms-auto bg-[var(--hay)]/20"
                        : "bg-black/25"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className="mt-1 text-[10px] text-[rgba(244,239,230,0.5)]">
                      {msg.direction === "OUT"
                        ? t(locale, "inboxYou")
                        : t(locale, "inboxThem")}
                      {` · ${formatWhen(locale, msg.createdAt)}`}
                    </p>
                  </li>
                ))}
              </ul>
              {selected.windowOpen ? (
                <div className="mt-3 flex gap-2">
                  <textarea
                    className="shop-field min-h-16 flex-1 rounded-xl px-3 py-2 text-sm"
                    value={draft}
                    placeholder={t(locale, "inboxReply")}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary self-end rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    onClick={reply}
                    disabled={sending}
                  >
                    {sending ? t(locale, "inboxSending") : t(locale, "inboxSend")}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--hay)]">
                  {t(locale, "inboxWindowClosed")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
