// File: app/(dashboard)/ai-leads/sources/page.tsx
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/sources/page.tsx)

import type { ReactNode } from "react";
import { db } from "@/lib/ai-leads/supabase";
import { setAiEnabled, setDisclosure, toggleSource } from "../actions";
import { ErrorNote, HeroTitle, Shell, fmtTime } from "../_components/ui";

const DISCLOSURE = [
  { key: "off", label: "Off", hint: "The AI never opens with it." },
  { key: "california", label: "California only", hint: "Leads moving from CA, or with a California area code." },
  { key: "all", label: "Every call", hint: "The AI opens every call with it." },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Source {
  name: string;
  enabled: boolean;
  note: string | null;
  first_seen: string;
}

interface Hours {
  dow: number;
  open_time: string;
  close_time: string;
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export default async function SettingsPage() {
  const supa = db();
  const [sourcesRes, settingsRes, hoursRes] = await Promise.all([
    supa.from("ai_lead_sources").select("*").order("enabled", { ascending: false }).order("name").returns<Source[]>(),
    supa.from("ai_settings").select("*").eq("id", 1).single(),
    supa.from("ai_business_hours").select("*").order("dow").returns<Hours[]>(),
  ]);

  const errors = [sourcesRes.error, settingsRes.error, hoursRes.error].filter((e) => e !== null).map((e) => e.message);
  const sources = sourcesRes.data ?? [];
  const settings = settingsRes.data;
  const hours = hoursRes.data ?? [];
  const aiOn = settings?.ai_enabled ?? true;
  const disclosure: string = settings?.ai_disclosure ?? "california";

  return (
    <Shell
      active="sources"
      aiEnabled={settings?.ai_enabled}
      hero={<HeroTitle title="Settings" description="Control who the AI contacts and how it opens each call." />}
    >
      <ErrorNote messages={errors} />

      <div className="divide-y divide-[#EEF0F6] rounded-2xl border border-[#E6E8F2] bg-white shadow-[0_12px_32px_-16px_rgba(46,59,219,0.35)]">
        <Row
          title="AI outreach"
          description="Pausing stops every text and call right away. New leads are still saved and wait in line."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${aiOn ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
              <span className="font-medium">{aiOn ? "On, leads are being contacted" : "Paused"}</span>
            </div>
            <form action={setAiEnabled}>
              <input type="hidden" name="enabled" value={aiOn ? "false" : "true"} />
              <button
                className={`rounded-xl px-3.5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A35E0] ${
                  aiOn
                    ? "border border-[#D9DBE9] bg-white text-[#3F4060] hover:bg-[#F8F7FF]"
                    : "bg-[#5A35E0] text-white hover:bg-[#4A28C7]"
                }`}
              >
                {aiOn ? "Pause outreach" : "Turn outreach on"}
              </button>
            </form>
          </div>
        </Row>

        <Row
          title="Lead sources"
          description="The AI only contacts leads from sources that are switched on. New sources from Granot show up here switched off, so you decide first."
        >
          {sources.length === 0 ? (
            <p className="text-sm text-[#6E7191]">No sources yet.</p>
          ) : (
            <ul className="divide-y divide-[#E6E8F2] rounded-xl border border-[#E6E8F2]">
              {sources.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${s.enabled ? "" : "text-[#6E7191]"}`}>{s.name}</p>
                    <p className="truncate text-xs text-[#6E7191]">{s.note ?? `First lead ${fmtTime(s.first_seen)}`}</p>
                  </div>
                  <form action={toggleSource}>
                    <input type="hidden" name="name" value={s.name} />
                    <input type="hidden" name="enabled" value={s.enabled ? "false" : "true"} />
                    <button
                      role="switch"
                      aria-checked={s.enabled}
                      aria-label={`Contact leads from ${s.name}`}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A35E0] ${
                        s.enabled ? "bg-[#5A35E0]" : "bg-[#D9DBE9]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                          s.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row
          title="Automated-call notice"
          description="Whether the AI opens the call by saying it's an automated assistant. It always says it's calling from Direct Relocation Services and always answers honestly if someone asks if it's an AI."
        >
          <div role="radiogroup" aria-label="Automated-call notice" className="grid gap-2 sm:grid-cols-3">
            {DISCLOSURE.map((d) => {
              const on = disclosure === d.key;
              return (
                <form key={d.key} action={setDisclosure}>
                  <input type="hidden" name="mode" value={d.key} />
                  <button
                    role="radio"
                    aria-checked={on}
                    className={`h-full w-full rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A35E0] ${
                      on ? "border-[#5A35E0] bg-[#F1EDFE] ring-1 ring-[#5A35E0]" : "border-[#D9DBE9] bg-white hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full border ${
                          on ? "border-[#5A35E0] bg-[#5A35E0]" : "border-[#D9DBE9] bg-white"
                        }`}
                      >
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      {d.label}
                    </span>
                    <span className="mt-1 block text-xs text-[#6E7191]">{d.hint}</span>
                  </button>
                </form>
              );
            })}
          </div>
        </Row>

        <Row
          title="Contact hours"
          description="The AI only texts and calls inside business hours, and only between 8 am and 9 pm in the customer's own time zone."
        >
          <table className="w-full max-w-md text-sm">
            <tbody>
              {DAYS.map((day, dow) => {
                const h = hours.find((x) => x.dow === dow);
                return (
                  <tr key={day} className="border-b border-[#EEF0F6] last:border-0">
                    <td className={`py-2 ${h ? "font-medium" : "text-[#6E7191]"}`}>{day}</td>
                    <td className={`py-2 text-right tabular-nums ${h ? "" : "text-[#A0A3BD]"}`}>
                      {h ? `${to12h(h.open_time)} – ${to12h(h.close_time)} ET` : "Closed"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-[#6E7191]">
            Leads that arrive after hours wait until the next opening. The same phone number within{" "}
            {settings?.dedupe_days ?? 30} days counts as one lead.
          </p>
        </Row>
      </div>
    </Shell>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 px-5 py-6 md:px-6 lg:grid-cols-3 lg:gap-10">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#6E7191]">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}