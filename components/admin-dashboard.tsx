"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  matchAny: boolean;
  keywords: string[];
  mediaId: string | null;
  dmText: string;
  dmLink: string | null;
  dmButtonTitle: string | null;
  publicReplies: string[];
  replyToDms: boolean;
  priority: number;
};

type EventRow = {
  id: string;
  type: string;
  level: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type Status = {
  autoreplyEnabled: boolean;
  telegramConfigured: boolean;
  igUserId: string | null;
  tokenExpiresAt: string | null;
  counts: { rules: number; processedComments: number; events: number };
};

const emptyForm = {
  name: "",
  enabled: true,
  matchAny: false,
  keywords: "",
  mediaId: "",
  dmText: "",
  dmLink: "",
  dmButtonTitle: "",
  publicReplies: "",
  replyToDms: false,
  priority: 0,
};

type FormState = typeof emptyForm;

function ruleToForm(rule: Rule): FormState {
  return {
    name: rule.name,
    enabled: rule.enabled,
    matchAny: rule.matchAny,
    keywords: (rule.keywords ?? []).join("\n"),
    mediaId: rule.mediaId ?? "",
    dmText: rule.dmText,
    dmLink: rule.dmLink ?? "",
    dmButtonTitle: rule.dmButtonTitle ?? "",
    publicReplies: (rule.publicReplies ?? []).join("\n"),
    replyToDms: rule.replyToDms,
    priority: rule.priority,
  };
}

export function AdminDashboard({
  initialRules,
  initialEvents,
  initialStatus,
  initialError = "",
}: {
  initialRules: Rule[];
  initialEvents: EventRow[];
  initialStatus: Status | null;
  initialError?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"rules" | "events" | "status">("rules");
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [status, setStatus] = useState<Status | null>(initialStatus);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState(initialError);

  async function load() {
    setError("");
    const [rulesRes, eventsRes, statusRes] = await Promise.all([
      fetch("/api/admin/rules"),
      fetch("/api/admin/events"),
      fetch("/api/admin/status"),
    ]);
    if (rulesRes.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (!rulesRes.ok || !eventsRes.ok || !statusRes.ok) {
      setError("Could not load admin data. Check DATABASE_URL and migrations.");
      return;
    }
    const rulesJson = (await rulesRes.json()) as { rules: Rule[] };
    const eventsJson = (await eventsRes.json()) as { events: EventRow[] };
    const statusJson = (await statusRes.json()) as Status;
    setRules(rulesJson.rules);
    setEvents(eventsJson.events);
    setStatus(statusJson);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function saveRule(event: FormEvent) {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      keywords: form.keywords,
      publicReplies: form.publicReplies,
      priority: Number(form.priority) || 0,
    };
    const response = await fetch(
      editingId ? `/api/admin/rules/${editingId}` : "/api/admin/rules",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Save failed");
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/rules/${id}`, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    await load();
  }

  const title = useMemo(
    () => (editingId ? "Edit rule" : "New rule"),
    [editingId],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Rules, event log, and token status.</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      <nav className="mt-6 flex gap-2">
        {(["rules", "events", "status"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${
              tab === item ? "bg-accent text-white" : "border border-line text-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

      {tab === "rules" ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <form onSubmit={(event) => void saveRule(event)} className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-medium">{title}</h2>
            <Field label="Name">
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Keywords (one per line, or comma-separated)">
              <textarea
                value={form.keywords}
                onChange={(event) => setForm({ ...form, keywords: event.target.value })}
                rows={4}
                className={inputClass}
                placeholder={"price\nlink"}
              />
            </Field>
            <Field label="Private reply text">
              <textarea
                value={form.dmText}
                onChange={(event) => setForm({ ...form, dmText: event.target.value })}
                rows={4}
                required
                className={inputClass}
                placeholder="Thanks {username} — here is the link."
              />
            </Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Link (optional)">
                <input
                  value={form.dmLink}
                  onChange={(event) => setForm({ ...form, dmLink: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Button title (optional)">
                <input
                  value={form.dmButtonTitle}
                  onChange={(event) => setForm({ ...form, dmButtonTitle: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Public comment replies (one per line, chosen at random)">
              <textarea
                value={form.publicReplies}
                onChange={(event) => setForm({ ...form, publicReplies: event.target.value })}
                rows={3}
                className={inputClass}
              />
            </Field>
            <Field label="Limit to media / post id (optional)">
              <input
                value={form.mediaId}
                onChange={(event) => setForm({ ...form, mediaId: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Priority (higher wins)">
              <input
                type="number"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
                className={inputClass}
              />
            </Field>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              Enabled
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.matchAny}
                onChange={(event) => setForm({ ...form, matchAny: event.target.checked })}
              />
              Match any comment
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.replyToDms}
                onChange={(event) => setForm({ ...form, replyToDms: event.target.checked })}
              />
              Also auto-reply to matching inbound DMs
            </label>
            <div className="mt-5 flex gap-2">
              <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm text-white">
                Save
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-full border border-line px-4 py-2 text-sm text-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="space-y-3">
            {rules.length === 0 ? (
              <p className="text-sm text-muted">No rules yet. Create one to start matching comments.</p>
            ) : null}
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{rule.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {rule.enabled ? "On" : "Off"}
                      {rule.matchAny ? " · any comment" : ` · ${rule.keywords.join(", ") || "no keywords"}`}
                      {rule.mediaId ? ` · post ${rule.mediaId}` : " · all posts"}
                      {rule.replyToDms ? " · DMs" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-muted hover:text-foreground"
                      onClick={() => {
                        setEditingId(rule.id);
                        setForm(ruleToForm(rule));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-accent"
                      onClick={() => void deleteRule(rule.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{rule.dmText}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "events" ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.level === "error" ? "text-accent" : "text-foreground"}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.message}
                    {row.payload ? (
                      <pre className="mt-1 max-w-xl overflow-x-auto font-mono text-[11px] text-muted/80">
                        {JSON.stringify(row.payload)}
                      </pre>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">No events yet. Webhooks will show up here.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "status" && status ? (
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <Stat label="Auto-reply" value={status.autoreplyEnabled ? "enabled" : "killed"} />
          <Stat label="Telegram reports" value={status.telegramConfigured ? "on" : "off"} />
          <Stat label="IG user id" value={status.igUserId ?? "not set"} />
          <Stat label="Token expiry" value={status.tokenExpiresAt ?? "unknown (env token)"} />
          <Stat label="Rules" value={String(status.counts.rules)} />
          <Stat label="Processed comments" value={String(status.counts.processedComments)} />
          <Stat label="Event rows" value={String(status.counts.events)} />
        </dl>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block text-sm text-muted">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-2 text-lg">{value}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-background px-3 py-2 text-foreground outline-none focus:border-accent";
