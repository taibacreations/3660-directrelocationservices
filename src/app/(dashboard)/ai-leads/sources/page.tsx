// File: app/(dashboard)/ai-leads/sources/page.tsx  (REPLACE existing file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/sources/page.tsx)

import type { ReactNode } from "react";
import { db } from "@/lib/ai-leads/supabase";
import { addSource, saveSourceRouting, setAiEnabled, setDisclosure, toggleSource } from "../actions";
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
  twilio_number: string | null;
  ringcentral_did: string | null;
  vapi_phone_number_id: string | null;
}

/** "+19545695292" → "(954) 569-5292" */
function fmtPhone(e164: string | null | undefined) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 || null;
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
  const defaultFrom = fmtPhone(settings?.default_from_number) ?? "(954) 569-5292";
  const defaultDid = fmtPhone(settings?.transfer_number) ?? "(855) 378-3110";

  return (
    <Shell
      active="sources"
      aiEnabled={settings?.ai_enabled}
      hero={<HeroTitle title="Settings" description="Control who the AI contacts and how it opens each call." />}
    >
      <ErrorNote messages={errors} />

      <div className="divide-y divide-[#F0F0F0] rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]">
        <Row
          title="AI outreach"
          description="Pausing stops every text and call right away. New leads are still saved and wait in line."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${aiOn ? "bg-[#16A34A]" : "bg-[#F59E0B]"}`} />
              <span className="font-medium">{aiOn ? "On, leads are being contacted" : "Paused"}</span>
            </div>
            <form action={setAiEnabled}>
              <input type="hidden" name="enabled" value={aiOn ? "false" : "true"} />
              <button
                className={`rounded-xl px-3.5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
                  aiOn
                    ? "border border-[#D4D4D4] bg-white text-[#3D3D3D] hover:bg-[#FAFAFA]"
                    : "bg-[#E10600] text-white hover:bg-[#C00500]"
                }`}
              >
                {aiOn ? "Pause outreach" : "Turn outreach on"}
              </button>
            </form>
          </div>
        </Row>

        <Row
          title="Lead sources"
          description="The AI only contacts leads from sources that are switched on. Each source can have its own Twilio number (texts and calls go out from it) and its own RingCentral DID (calls transfer to it)."
        >
          {sources.length === 0 ? (
            <p className="text-sm text-[#737373]">No sources yet.</p>
          ) : (
            <ul className="divide-y divide-[#E5E5E5] rounded-xl border border-[#E5E5E5]">
              {sources.map((s) => (
                <li key={s.name} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${s.enabled ? "" : "text-[#737373]"}`}>{s.name}</p>
                    <p className="truncate text-xs text-[#737373]">
                      {s.twilio_number || s.ringcentral_did
                        ? `Texts and calls from ${fmtPhone(s.twilio_number) ?? defaultFrom}, transfers to ${fmtPhone(s.ringcentral_did) ?? defaultDid}`
                        : s.note ?? `First lead ${fmtTime(s.first_seen)}`}
                    </p>
                  </div>
                  <form action={toggleSource}>
                    <input type="hidden" name="name" value={s.name} />
                    <input type="hidden" name="enabled" value={s.enabled ? "false" : "true"} />
                    <button
                      role="switch"
                      aria-checked={s.enabled}
                      aria-label={`Contact leads from ${s.name}`}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
                        s.enabled ? "bg-[#E10600]" : "bg-[#D4D4D4]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                          s.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </form>
                  </div>

                  <details className="group mt-2">
                    <summary className="w-fit cursor-pointer list-none rounded-lg text-xs font-bold text-[#E10600] hover:text-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]">
                      <span className="group-open:hidden">Edit numbers</span>
                      <span className="hidden group-open:inline">Close</span>
                    </summary>
                    <form action={saveSourceRouting} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="name" value={s.name} />
                      <Field
                        name="twilio_number"
                        label="Twilio number"
                        hint={`Texts and calls go out from this number. Empty = ${defaultFrom}.`}
                        defaultValue={fmtPhone(s.twilio_number) ?? ""}
                        placeholder="(954) 555-0100"
                      />
                      <Field
                        name="ringcentral_did"
                        label="RingCentral DID"
                        hint={`"Yes" calls and inbound calls go here. Empty = ${defaultDid}.`}
                        defaultValue={fmtPhone(s.ringcentral_did) ?? ""}
                        placeholder="(954) 555-0199"
                      />
                      <Field
                        name="vapi_phone_number_id"
                        label="Vapi number ID"
                        hint="Set by your developer after the Twilio number is connected to Vapi."
                        defaultValue={s.vapi_phone_number_id ?? ""}
                        placeholder="a81de8a7-…"
                        mono
                      />
                      <div className="flex items-end">
                        <button className="rounded-xl bg-[#E10600] px-4 py-2 text-sm font-medium text-white hover:bg-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]">
                          Save numbers
                        </button>
                      </div>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <form action={addSource} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-[#3D3D3D]">Add a source</span>
              <input
                name="name"
                required
                placeholder="Exact name as Granot sends it"
                className="mt-1 w-full rounded-xl border border-[#D4D4D4] bg-white px-3 py-2 text-sm placeholder:text-[#A3A3A3] focus:border-[#E10600] focus:outline-none focus:ring-1 focus:ring-[#E10600]"
              />
            </label>
            <button className="rounded-xl border border-[#D4D4D4] bg-white px-4 py-2 text-sm font-medium text-[#3D3D3D] hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]">
              Add source
            </button>
          </form>
          <p className="mt-2 text-xs text-[#737373]">New sources start switched off. Sources also appear here on their own when the first lead arrives.</p>
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
                    className={`h-full w-full rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
                      on ? "border-[#E10600] bg-[#FDECEB] ring-1 ring-[#E10600]" : "border-[#D4D4D4] bg-white hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full border ${
                          on ? "border-[#E10600] bg-[#E10600]" : "border-[#D4D4D4] bg-white"
                        }`}
                      >
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      {d.label}
                    </span>
                    <span className="mt-1 block text-xs text-[#737373]">{d.hint}</span>
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
                  <tr key={day} className="border-b border-[#F0F0F0] last:border-0">
                    <td className={`py-2 ${h ? "font-medium" : "text-[#737373]"}`}>{day}</td>
                    <td className={`py-2 text-right tabular-nums ${h ? "" : "text-[#A3A3A3]"}`}>
                      {h ? `${to12h(h.open_time)} – ${to12h(h.close_time)} ET` : "Closed"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-[#737373]">
            Leads that arrive after hours wait until the next opening. The same phone number within{" "}
            {settings?.dedupe_days ?? 30} days counts as one lead.
          </p>
        </Row>
      </div>
    </Shell>
  );
}

function Field({
  name,
  label,
  hint,
  defaultValue,
  placeholder,
  mono = false,
}: {
  name: string;
  label: string;
  hint: string;
  defaultValue: string;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-medium text-[#3D3D3D]">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl border border-[#D4D4D4] bg-white px-3 py-2 text-sm placeholder:text-[#A3A3A3] focus:border-[#E10600] focus:outline-none focus:ring-1 focus:ring-[#E10600] ${
          mono ? "font-mono text-xs" : "tabular-nums"
        }`}
      />
      <span className="mt-1 block text-xs text-[#737373]">{hint}</span>
    </label>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 px-5 py-6 md:px-6 lg:grid-cols-3 lg:gap-10">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#737373]">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}