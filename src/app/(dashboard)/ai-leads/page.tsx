// File: src/app/(dashboard)/ai-leads/page.tsx  (REPLACE existing file)

import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/lib/ai-leads/supabase";
import {
  Avatar,
  Card,
  Empty,
  ErrorNote,
  HeroTitle,
  display,
  Shell,
  StatusBadge,
  fmtDuration,
  fmtPhone,
  fmtTime,
  fullName,
  moveLine,
} from "./_components/ui";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "In progress" },
  { key: "transferred", label: "Transferred" },
  { key: "missed_transfer", label: "Missed transfer" },
  { key: "opted_out", label: "Opted out" },
  { key: "unresponsive", label: "No response" },
  { key: "prefers_contact", label: "Text / email" },
  { key: "excluded", label: "Source off" },
];
const LIVE = ["new", "held", "active", "opted_in", "missed_transfer", "callback_scheduled"];
const NEXT_ACTION: Record<string, string> = { sms: "Text", call: "AI call", mark_unresponsive: "Close out" };
const SOURCE_BARS = ["bg-[#E10600]", "bg-[#1E1E1E]", "bg-[#F59E0B]", "bg-[#16A34A]", "bg-[#2563EB]", "bg-[#8A8A8A]"];

interface Metrics {
  leads_total: number;
  leads_active: number;
  leads_held: number;
  opted_in: number;
  opted_out: number;
  unresponsive: number;
  excluded: number;
  transferred: number;
  missed_transfers: number;
  conversion_pct: number | null;
  avg_seconds_to_connect: number | null;
  contacted: number | null;
}

interface SourceRow {
  source: string;
  leads: number;
  contacted: number;
  said_yes: number;
  transferred: number;
  opted_out: number;
  unresponsive: number;
  transfer_rate_pct: number | null;
}

interface LeadRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string;
  from_city: string | null;
  from_state: string | null;
  to_city: string | null;
  to_state: string | null;
  source: string | null;
  status: string;
  contact_preference: string | null;
  attempt_count: number;
  next_action: string | null;
  next_action_at: string | null;
  seconds_to_connect: number | null;
}

export default async function AiLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const supa = db();

  let query = supa.from("v_ai_leads").select("*").order("created_at", { ascending: false }).limit(200);
  if (status === "live") query = query.in("status", LIVE);
  else if (status !== "all") query = query.eq("status", status);
  if (q.trim()) {
    const term = q.trim().replace(/[%,()]/g, "");
    const digits = term.replace(/\D/g, "");
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone_e164.ilike.%${digits || term}%,granot_job_number.ilike.%${term}%`
    );
  }

  const [metricsRes, sourcesRes, leadsRes, settingsRes] = await Promise.all([
    supa.from("v_ai_metrics").select("*").single<Metrics>(),
    supa.from("v_ai_source_report").select("*").returns<SourceRow[]>(),
    query.returns<LeadRow[]>(),
    supa.from("ai_settings").select("ai_enabled").eq("id", 1).single<{ ai_enabled: boolean }>(),
  ]);

  const errors = [metricsRes.error, sourcesRes.error, leadsRes.error, settingsRes.error]
    .filter((e) => e !== null)
    .map((e) => e.message);
  const m = metricsRes.data;
  const sources = sourcesRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const aiEnabled = settingsRes.data?.ai_enabled;
  const filtered = q.trim() !== "" || status !== "all";

  const total = m?.leads_total ?? 0;
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const stats: { label: string; value: number; pct: number; note: string; color: string; tint: string; bar: string; icon: ReactNode }[] = [
    {
      label: "New leads",
      value: total,
      pct: total ? 100 : 0,
      note: `${m?.leads_active ?? 0} in progress right now`,
      color: "text-[#1E1E1E]",
      tint: "bg-[#EDEDED]",
      bar: "bg-[#1E1E1E]",
      icon: <path d="M4 13h4l2 3h4l2-3h4M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
    },
    {
      label: "Contacted",
      value: m?.contacted ?? 0,
      pct: share(m?.contacted ?? 0),
      note: `${share(m?.contacted ?? 0)}% of all leads`,
      color: "text-[#D97706]",
      tint: "bg-[#FFF4DB]",
      bar: "bg-[#F59E0B]",
      icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    },
    {
      label: "Said yes",
      value: m?.opted_in ?? 0,
      pct: share(m?.opted_in ?? 0),
      note: `${share(m?.opted_in ?? 0)}% of all leads`,
      color: "text-[#E10600]",
      tint: "bg-[#FDECEB]",
      bar: "bg-[#E10600]",
      icon: <path d="M20 6L9 17l-5-5" />,
    },
    {
      label: "Transferred live",
      value: m?.transferred ?? 0,
      pct: share(m?.transferred ?? 0),
      note: `${m?.conversion_pct ?? 0}% conversion`,
      color: "text-[#16A34A]",
      tint: "bg-[#E7F6EC]",
      bar: "bg-[#16A34A]",
      icon: <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
    },
  ];

  const facts = [
    { label: "Avg. time to live call", value: fmtDuration(m?.avg_seconds_to_connect), dot: "bg-[#1E1E1E]" },
    { label: "Missed transfers", value: String(m?.missed_transfers ?? 0), dot: "bg-[#F59E0B]" },
    { label: "Opted out", value: String(m?.opted_out ?? 0), dot: "bg-[#E10600]" },
    { label: "No response", value: String(m?.unresponsive ?? 0), dot: "bg-[#A3A3A3]" },
    { label: "Waiting for open", value: String(m?.leads_held ?? 0), dot: "bg-[#2563EB]" },
  ];

  return (
    <Shell
      active="leads"
      aiEnabled={aiEnabled}
      hero={<HeroTitle title="Leads" description="Every lead the AI is texting and calling, newest first. Times are Eastern." />}
    >
      {/* Stat cards (overlap the gradient) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#737373]">{s.label}</p>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${s.tint} ${s.color}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {s.icon}
                </svg>
              </span>
            </div>
            <p className={`${display.className} mt-2 text-4xl font-extrabold italic tracking-tight tabular-nums md:text-5xl`}>{s.value.toLocaleString()}</p>
            <div className={`mt-4 h-1.5 overflow-hidden rounded-full ${s.tint}`}>
              <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-[#737373]">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {facts.map((f) => (
          <span key={f.label} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-sm shadow-sm">
            <span className={`h-2 w-2 rounded-full ${f.dot}`} />
            <span className="text-[#737373]">{f.label}</span>
            <span className="font-bold tabular-nums">{f.value}</span>
          </span>
        ))}
      </div>

      <div className="mt-8">
        <ErrorNote messages={errors} />
        {aiEnabled === false && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FBD68A] bg-[#FFF8E6] px-5 py-3.5 text-sm">
            <span className="text-[#92400E]">
              <span className="font-bold">AI outreach is paused.</span> New leads are saved but nobody is texted or called.
            </span>
            <Link href="/ai-leads/sources" className="font-bold text-[#92400E] underline underline-offset-2">
              Open settings
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        {/* Leads */}
        <Card className="min-w-0 xl:col-span-3">
          <div className="flex flex-col gap-3 border-b border-[#F0F0F0] p-4 md:px-5">
            <nav className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter leads">
              {FILTERS.map((f) => {
                const on = status === f.key;
                return (
                  <Link
                    key={f.key}
                    href={`/ai-leads?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    aria-current={on ? "page" : undefined}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      on ? "bg-[#1E1E1E] text-white shadow-sm" : "text-[#737373] hover:bg-[#F0F0F0] hover:text-[#171717]"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </nav>
            <form action="/ai-leads" className="relative w-full">
              <input type="hidden" name="status" value={status} />
              <label htmlFor="lead-search" className="sr-only">
                Search leads
              </label>
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                id="lead-search"
                name="q"
                defaultValue={q}
                placeholder="Name, phone or job number"
                className="w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] py-2.5 pl-9 pr-3 text-sm placeholder:text-[#A3A3A3] focus:border-[#E10600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E10600]/20"
              />
            </form>
          </div>

          {leads.length === 0 ? (
            <Empty
              title={filtered ? "No leads match" : "No leads yet"}
              body={
                filtered
                  ? "Try a different tab or clear the search."
                  : "As soon as a lead comes in from Granot or the website form, it shows up here."
              }
            />
          ) : (
            <>
              {/* Mobile */}
              <ul className="divide-y divide-[#F0F0F0] md:hidden">
                {leads.map((l) => {
                  const name = fullName(l.first_name, l.last_name);
                  return (
                    <li key={l.id}>
                      <Link href={`/ai-leads/${l.id}`} className="flex gap-3 px-4 py-4 active:bg-[#FAFAFA]">
                        <Avatar name={name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{name}</p>
                              <p className="text-sm text-[#737373]">{fmtPhone(l.phone_e164)}</p>
                            </div>
                            <StatusBadge status={l.status} pref={l.contact_preference} />
                          </div>
                          <p className="mt-2 text-sm text-[#3D3D3D]">{moveLine(l.from_city, l.from_state, l.to_city, l.to_state) || "No move details"}</p>
                          <p className="mt-1 text-xs text-[#737373]">
                            {fmtTime(l.created_at)} from {l.source ?? "unknown source"}
                          </p>
                          {l.next_action && (
                            <p className="mt-1 text-xs font-semibold text-[#E10600]">
                              Next: {NEXT_ACTION[l.next_action] ?? l.next_action}, {fmtTime(l.next_action_at)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-semibold text-[#A3A3A3]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Move</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Next step</th>
                      <th className="px-5 py-3 text-right font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {leads.map((l) => {
                      const name = fullName(l.first_name, l.last_name);
                      return (
                        <tr key={l.id} className="transition-colors hover:bg-[#FAFAFA]">
                          <td className="px-5 py-3.5">
                            <Link href={`/ai-leads/${l.id}`} className="group flex items-center gap-3">
                              <Avatar name={name} />
                              <span className="min-w-0">
                                <span className="block font-bold group-hover:text-[#E10600]">{name}</span>
                                <span className="block tabular-nums text-[#737373]">{fmtPhone(l.phone_e164)}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="max-w-[260px] px-4 py-3.5 text-[#3D3D3D]">
                            <p className="truncate">{moveLine(l.from_city, l.from_state, l.to_city, l.to_state) || "—"}</p>
                          </td>
                          <td className="px-4 py-3.5 text-[#3D3D3D]">{l.source ?? "—"}</td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={l.status} pref={l.contact_preference} />
                            <p className="mt-1 text-xs text-[#737373]">
                              {l.status === "transferred" && l.seconds_to_connect !== null
                                ? `Connected in ${fmtDuration(l.seconds_to_connect)}`
                                : `${l.attempt_count} ${l.attempt_count === 1 ? "attempt" : "attempts"}`}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            {l.next_action ? (
                              <>
                                <p className="font-semibold text-[#E10600]">{NEXT_ACTION[l.next_action] ?? l.next_action}</p>
                                <p className="text-xs text-[#737373]">{fmtTime(l.next_action_at)}</p>
                              </>
                            ) : (
                              <span className="text-[#A3A3A3]">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right text-[#737373]">{fmtTime(l.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        {/* Sources */}
        <Card
          title="By lead source"
          className="self-start"
          aside={
            <Link href="/ai-leads/sources" className="text-sm font-bold text-[#E10600] hover:text-[#C00500]">
              Manage
            </Link>
          }
        >
          {sources.length === 0 ? (
            <Empty title="No sources yet" body="Each source shows up here with its transfer rate." />
          ) : (
            <ul className="space-y-5 p-5">
              {sources.map((s, i) => (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SOURCE_BARS[i % SOURCE_BARS.length]}`} />
                      <span className="truncate">{s.source}</span>
                    </span>
                    <span className="shrink-0 font-extrabold tabular-nums">
                      {s.transfer_rate_pct === null ? <span className="font-semibold text-[#A3A3A3]">—</span> : `${s.transfer_rate_pct}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0F0F0]">
                    <div
                      className={`h-full rounded-full ${SOURCE_BARS[i % SOURCE_BARS.length]}`}
                      style={{ width: `${Math.min(s.transfer_rate_pct ?? 0, 100)}%` }}
                    />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      ["Leads", s.leads],
                      ["Contacted", s.contacted],
                      ["Said yes", s.said_yes],
                      ["Transferred", s.transferred],
                    ].map(([label, value]) => (
                      <div key={label} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[#F5F5F5] px-2.5 py-1.5">
                        <dt className="truncate text-xs text-[#737373]">{label}</dt>
                        <dd className="text-sm font-extrabold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {(s.opted_out > 0 || s.unresponsive > 0) && (
                    <p className="mt-1.5 text-xs text-[#737373]">
                      {s.opted_out} opted out, {s.unresponsive} no response
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}