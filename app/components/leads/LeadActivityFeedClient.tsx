"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  type: string;
  message: string;
  metadata: any;
  created_at: string;
  created_by: string | null;
  username?: string;
};

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function LeadActivityFeedClient({
  leadId,
  initialItems,
}: {
  leadId: string;
  initialItems: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);

  // Log a view (server-side throttled)
  useEffect(() => {
    void fetch(`/api/leads/${leadId}/view`, { method: "POST" }).catch(() => {});
  }, [leadId]);

  // Refresh hook (note form triggers this event)
  useEffect(() => {
    function onRefresh(e: Event) {
      const ce = e as CustomEvent<{ leadId: string }>;
      if (ce.detail?.leadId !== leadId) return;

      void fetch(`/api/leads/${leadId}/activity`)
        .then(async (r) => {
          if (!r.ok) return null;
          return (await r.json()) as { ok: true; items: Item[] };
        })
        .then((payload) => {
          if (!payload) return;
          setItems(payload.items);
        })
        .catch(() => {});
    }

    window.addEventListener("khcrm:activity:refresh", onRefresh as EventListener);
    return () => {
      window.removeEventListener("khcrm:activity:refresh", onRefresh as EventListener);
    };
  }, [leadId]);

  const content = useMemo(() => items ?? [], [items]);

  return (
    <div className="max-h-[520px] overflow-auto rounded-xl border border-white/10">
      {content.length === 0 ? (
        <div className="p-4 text-sm text-white/70">No activity yet.</div>
      ) : (
        <ul className="divide-y divide-white/10">
          {content.map((a) => (
            <li key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    {prettyType(a.type)}
                  </div>
                  <div className="mt-1 text-sm text-white">{a.message}</div>
                  {a.metadata && Object.keys(a.metadata).length > 0 ? (
                    <pre className="mt-2 overflow-auto rounded-lg bg-black/20 p-2 text-xs text-white/70">
                      {JSON.stringify(a.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-white/70">{a.username ?? "—"}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {a.created_at ? formatDate(a.created_at) : "—"}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
