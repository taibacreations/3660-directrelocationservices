// File: app/(dashboard)/ai-leads/sources/page.tsx  (REPLACE existing file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/sources/page.tsx)

import { db } from "@/lib/ai-leads/supabase";
import { setAiEnabled, setDisclosure } from "../actions";
import { Card, ErrorNote, HeroTitle, Shell, fmtTime } from "../_components/ui";
import { PendingButton } from "../_components/pending-button";
import { AddSourceForm, SourceRow } from "../_components/source-forms";

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

interface Hours {
  dow: number;
  open_time: string;
  close_time: string;
}

/** "+19545695292" → "(954) 569-5292". Kept here because a server page can't call functions from a "use client" file. */
function fmtPhone(e164: string | null | undefined) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 || null;
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

/** Day of week (0 = Sunday) right now in Eastern time */
function todayEt() {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long" }).format(new Date());
  return DAYS.indexOf(name);
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
  const onCount = sources.filter((s) => s.enabled).length;
  const today = todayEt();

  return (
    <Shell
      active="sources"
      aiEnabled={settings?.ai_enabled}
      hero={<HeroTitle title="Settings" description="Control who the AI contacts, which numbers it uses, and how it opens each call." />}
    >
      <ErrorNote messages={errors} />

      <div className="space-y-6">
        {/* ------------------------------------------------ AI outreach */}
        <section
          className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.18)] ${
            aiOn ? "border-[#E5E5E5]" : "border-[#F8D99B]"
          }`}
        >
          <div className={`h-1 ${aiOn ? "bg-[#16A34A]" : "bg-[#F59E0B]"}`} />
          <div className="flex flex-wrap items-center gap-4 px-5 py-5 md:px-6">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${aiOn ? "bg-[#E7F6EC] text-[#15803D]" : "bg-[#FFF4DB] text-[#B45309]"}`}
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {aiOn ? (
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
                ) : (
                  <path d="M10 4H6v16h4zM18 4h-4v16h4z" />
                )}
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold">{aiOn ? "AI outreach is on" : "AI outreach is paused"}</h2>
              <p className="mt-0.5 text-sm text-[#737373]">
                {aiOn
                  ? "New leads are texted and called during contact hours. Pausing stops every text and call right away."
                  : "No texts or calls are going out. New leads are still saved and wait in line until you turn it back on."}
              </p>
            </div>
            <form action={setAiEnabled}>
              <input type="hidden" name="enabled" value={aiOn ? "false" : "true"} />
              <PendingButton
                tone={aiOn ? "dark" : "light"}
                pendingText={aiOn ? "Pausing…" : "Turning on…"}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
                  aiOn
                    ? "border border-[#D4D4D4] bg-white text-[#3D3D3D] hover:border-[#1E1E1E] hover:bg-[#1E1E1E] hover:text-white"
                    : "bg-[#E10600] text-white hover:bg-[#C00500]"
                }`}
              >
                {aiOn ? "Pause outreach" : "Turn outreach on"}
              </PendingButton>
            </form>
          </div>
        </section>

        {/* ------------------------------------------------ Lead sources */}
        <Card
          title="Lead sources"
          description="Switch a source off and the AI won't contact its leads. Each source can text and call from its own Twilio number and transfer to its own RingCentral DID."
          aside={
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-bold text-[#525252]">
              {onCount} on · {sources.length - onCount} off
            </span>
          }
        >
          {sources.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#737373]">No sources yet. They appear here when the first lead arrives.</p>
          ) : (
            <>
              <div className="hidden grid-cols-[44px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_84px] gap-x-4 border-b border-[#F0F0F0] bg-[#FAFAFA] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#737373] md:grid">
                <span>On</span>
                <span>Source</span>
                <span>Texts &amp; calls from</span>
                <span>Transfers to</span>
                <span />
              </div>
              <ul className="divide-y divide-[#F0F0F0]">
                {sources.map((s) => (
                  <SourceRow
                    key={s.name}
                    defaultFrom={defaultFrom}
                    defaultDid={defaultDid}
                    s={{
                      name: s.name,
                      enabled: s.enabled,
                      note: s.note,
                      firstSeen: fmtTime(s.first_seen),
                      twilio: s.twilio_number,
                      did: s.ringcentral_did,
                      vapiId: s.vapi_phone_number_id,
                    }}
                  />
                ))}
              </ul>
            </>
          )}

          <div className="rounded-b-2xl border-t border-[#F0F0F0] bg-[#FAFAFA] px-5 pb-5 pt-1">
            <AddSourceForm />
            <p className="mt-2 text-xs text-[#737373]">
              Use the name exactly as Granot sends it. New sources start switched on, and also appear here on their own when
              their first lead arrives. Switch off any source the AI should not contact (for example Equate Warm).
            </p>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ------------------------------------------------ Disclosure */}
          <Card
            title="Automated-call notice"
            description="Whether the AI opens the call by saying it's an automated assistant. It always says it's calling from Direct Relocation Services and answers honestly if asked."
          >
            <div role="radiogroup" aria-label="Automated-call notice" className="space-y-2 p-5">
              {DISCLOSURE.map((d) => {
                const on = disclosure === d.key;
                return (
                  <form key={d.key} action={setDisclosure}>
                    <input type="hidden" name="mode" value={d.key} />
                    <PendingButton
                      indicator="none"
                      role="radio"
                      aria-checked={on}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
                        on ? "border-[#E10600] bg-[#FDECEB] ring-1 ring-[#E10600]" : "border-[#E5E5E5] bg-white hover:border-[#D4D4D4] hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          on ? "border-[#E10600] bg-[#E10600]" : "border-[#D4D4D4] bg-white"
                        }`}
                      >
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block text-sm font-bold">{d.label}</span>
                        <span className="mt-0.5 block text-xs text-[#737373]">{d.hint}</span>
                      </span>
                    </PendingButton>
                  </form>
                );
              })}
            </div>
          </Card>

          {/* ------------------------------------------------ Hours */}
          <Card
            title="Contact hours"
            description="The AI only texts and calls inside these hours, and only between 8 am and 9 pm in the customer's own time zone."
          >
            <ul className="space-y-1 p-5">
              {DAYS.map((day, dow) => {
                const h = hours.find((x) => x.dow === dow);
                const isToday = dow === today;
                return (
                  <li key={day} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isToday ? "bg-[#FDECEB]" : ""}`}>
                    <span className={`flex items-center gap-2 ${h ? "font-semibold" : "text-[#737373]"}`}>
                      {day}
                      {isToday && (
                        <span className="rounded-full bg-[#E10600] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Today</span>
                      )}
                    </span>
                    <span className={`tabular-nums ${h ? "font-medium" : "text-[#A3A3A3]"}`}>
                      {h ? `${to12h(h.open_time)} – ${to12h(h.close_time)} ET` : "Closed"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-[#F0F0F0] px-5 py-4 text-xs text-[#737373]">
              Leads that arrive after hours wait until the next opening. The same phone number within{" "}
              {settings?.dedupe_days ?? 30} days counts as one lead.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}