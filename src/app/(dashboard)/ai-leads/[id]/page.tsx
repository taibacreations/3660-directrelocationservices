// File: app/(dashboard)/ai-leads/[id]/page.tsx
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/[id]/page.tsx)

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/ai-leads/supabase";
import { manualOptOut } from "../actions";
import {
  Avatar,
  Card,
  ErrorNote,
  HeroTitle,
  Shell,
  StatusBadge,
  fmtDuration,
  fmtPhone,
  fmtTime,
  fullName,
  moveLine,
  place,
} from "../_components/ui";

interface Activity {
  at: string;
  kind: "sms_outbound" | "sms_inbound" | "call" | "transfer";
  detail: string | null;
  status: string | null;
  recording_url: string | null;
}

const KIND: Record<Activity["kind"], { label: string; icon: string; bubble: string }> = {
  sms_outbound: { label: "Text sent", icon: "bg-[#EAF1FF] text-[#2F6BFF]", bubble: "border-[#DCE6FF] bg-[#F5F8FF]" },
  sms_inbound: { label: "Customer replied", icon: "bg-[#FFF5E0] text-[#D97706]", bubble: "border-[#FDE7B0] bg-[#FFFBF0]" },
  call: { label: "AI call", icon: "bg-[#F3EEFF] text-[#8B5CF6]", bubble: "border-[#E6DEFF] bg-[#FAF8FF]" },
  transfer: { label: "Warm transfer", icon: "bg-[#E7F8F1] text-[#10B981]", bubble: "border-[#C9F0DF] bg-[#F4FCF8]" },
};

const TASK_LABEL: Record<string, string> = { sms: "Text", call: "AI call", mark_unresponsive: "Mark as no response" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = db();

  const [leadRes, activityRes, tasksRes] = await Promise.all([
    supa.from("v_ai_leads").select("*").eq("id", id).maybeSingle(),
    supa.from("v_ai_activity").select("*").eq("lead_id", id).order("at", { ascending: true }).returns<Activity[]>(),
    supa
      .from("ai_tasks")
      .select("id, action, step_no, reason, run_at")
      .eq("lead_id", id)
      .eq("status", "pending")
      .order("run_at"),
  ]);

  const errors = [leadRes.error, activityRes.error, tasksRes.error].filter((e) => e !== null).map((e) => e.message);
  if (errors.length) {
    return (
      <Shell active="leads" hero={<HeroTitle title="Lead" />}>
        <ErrorNote messages={errors} />
      </Shell>
    );
  }

  const lead = leadRes.data;
  if (!lead) notFound();
  const activity = activityRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const name = fullName(lead.first_name, lead.last_name);
  const canOptOut = !["opted_out", "invalid"].includes(lead.status);
  const channel =
    lead.origin_channel === "website" ? "Website form" : lead.origin_channel === "granot" ? "Granot" : lead.origin_channel;

  const details: [string, string | null | undefined][] = [
    ["Phone", fmtPhone(lead.phone_e164)],
    ["Email", lead.email],
    ["Moving from", place(lead.from_city, lead.from_state)],
    ["Moving to", place(lead.to_city, lead.to_state)],
    ["Move date", lead.move_date],
    ["Lead source", lead.source],
    ["Came in through", channel],
    ["Granot job", lead.granot_job_number],
    ["Received", fmtTime(lead.created_at)],
    ["Attempts", String(lead.attempt_count)],
    ["Time to live call", fmtDuration(lead.seconds_to_connect)],
    ["Note", lead.status_reason],
  ];

  const hero = (
    <HeroTitle
      above={
        <nav className="mb-4 text-sm text-white/70" aria-label="Breadcrumb">
          <Link href="/ai-leads" className="hover:text-white">
            Leads
          </Link>
          <span className="mx-2 text-white/40">/</span>
          <span className="text-white">{name}</span>
        </nav>
      }
      title={
        <span className="flex flex-wrap items-center gap-3">
          {name}
          <StatusBadge status={lead.status} />
        </span>
      }
      description={moveLine(lead.from_city, lead.from_state, lead.to_city, lead.to_state) || "No move details yet"}
      actions={
        <a
          href={`tel:${lead.phone_e164}`}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#5A35E0] shadow-lg shadow-black/10 hover:bg-[#F1EDFE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
          </svg>
          Call {fmtPhone(lead.phone_e164)}
        </a>
      }
    />
  );

  return (
    <Shell active="leads" hero={hero}>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card>
            <div className="flex items-center gap-4 border-b border-[#EEF0F6] px-5 py-4">
              <Avatar name={name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{name}</p>
                <p className="text-sm text-[#6E7191]">
                  {lead.source ?? "Unknown source"}, received {fmtTime(lead.created_at)} ET
                </p>
              </div>
            </div>
            <dl className="grid sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-[#EEF0F6] px-5 py-3 text-sm sm:odd:border-r">
                  <dt className="shrink-0 text-[#6E7191]">{label}</dt>
                  <dd className="truncate text-right font-semibold">{value || <span className="font-normal text-[#A0A3BD]">—</span>}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Activity" description="Every text and call for this lead, oldest first.">
            {activity.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[#6E7191]">No texts or calls yet.</p>
            ) : (
              <ol className="px-5 py-5">
                {activity.map((a, i) => {
                  const k = KIND[a.kind];
                  const last = i === activity.length - 1;
                  return (
                    <li key={i} className={`relative flex gap-4 ${last ? "" : "pb-6"}`}>
                      {!last && <span className="absolute bottom-0 left-[17px] top-10 w-0.5 rounded bg-[#EEF0F6]" aria-hidden />}
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${k.icon}`}>
                        <KindIcon kind={a.kind} />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <p>
                            <span className="font-bold">{k.label}</span>
                            {a.status && <span className="text-[#6E7191]">, {a.status.replace(/_/g, " ")}</span>}
                          </p>
                          <time className="text-xs text-[#6E7191]">{fmtTime(a.at)}</time>
                        </div>
                        {a.detail && (
                          <p className={`mt-2 max-w-2xl whitespace-pre-wrap rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed ${k.bubble}`}>
                            {a.detail}
                          </p>
                        )}
                        {a.recording_url && (
                          <audio controls preload="none" src={a.recording_url} className="mt-2 h-9 w-full max-w-md" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Scheduled">
            {tasks.length === 0 ? (
              <p className="px-5 py-5 text-sm text-[#6E7191]">Nothing scheduled.</p>
            ) : (
              <ul className="divide-y divide-[#EEF0F6]">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className={`h-2 w-2 rounded-full ${t.action === "call" ? "bg-[#8B5CF6]" : t.action === "sms" ? "bg-[#2F6BFF]" : "bg-[#A0A3BD]"}`} />
                      {TASK_LABEL[t.action] ?? t.action}
                      {t.step_no ? <span className="font-normal text-[#6E7191]">(step {t.step_no})</span> : null}
                    </span>
                    <span className="tabular-nums text-[#6E7191]">{fmtTime(t.run_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canOptOut && (
            <Card title="Stop contacting this number">
              <form action={manualOptOut} className="px-5 py-4">
                <input type="hidden" name="phone" value={lead.phone_e164} />
                <input type="hidden" name="leadId" value={lead.id} />
                <p className="text-sm text-[#6E7191]">
                  Cancels every scheduled text and call and blocks this number for future leads. This can&apos;t be
                  undone from the dashboard.
                </p>
                <button className="mt-4 rounded-xl bg-[#FFEEF1] px-4 py-2.5 text-sm font-bold text-[#BE123C] hover:bg-[#FFE0E6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BE123C]">
                  Opt out {fmtPhone(lead.phone_e164)}
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}

function KindIcon({ kind }: { kind: Activity["kind"] }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "call")
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    );
  if (kind === "transfer")
    return (
      <svg {...common}>
        <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {kind === "sms_inbound" && <path d="M8 10h8" />}
    </svg>
  );
}