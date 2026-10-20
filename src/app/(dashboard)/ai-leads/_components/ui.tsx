// File: src/app/(dashboard)/ai-leads/_components/ui.tsx  (REPLACE existing file)

import Link from "next/link";
import { Barlow, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { PendingButton } from "./pending-button";

export const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
// Italic, heavy headings to match the italic DRS wordmark
export const display = Barlow({ subsets: ["latin"], weight: ["700", "800"], style: ["italic"], display: "swap" });

export const CONTAINER = "mx-auto w-full max-w-[1480px] px-4 md:px-6 xl:px-10";
export const LOGO_SRC = "/logo.webp";

/* ---------------------------------------------------------------- Shell */

export function Shell({
  active,
  aiEnabled,
  hero,
  children,
}: {
  active: "leads" | "sources" | null;
  aiEnabled?: boolean;
  hero?: ReactNode;
  children: ReactNode;
}) {
  const tab = (on: boolean) =>
    `flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] md:px-4 ${
      on ? "bg-[#E10600] text-white shadow-[0_6px_14px_-6px_rgba(225,6,0,0.6)]" : "text-[#525252] hover:bg-[#F2F2F2] hover:text-[#171717]"
    }`;

  return (
    <div className={`${font.className} min-h-dvh bg-[#F5F5F5] text-[#171717] antialiased`}>
      {/* Thin red brand line + clean white header */}
      <div className="sticky top-0 z-40">
        <div className="h-1 bg-[#E10600]" aria-hidden />
        <div className="border-b border-[#EBEBEB] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <header className={`${CONTAINER} flex h-16 items-center gap-3 md:h-[70px] md:gap-5`}>
            <Link
              href="/ai-leads"
              className="flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600]"
              aria-label="Direct Relocation Services, AI Leads"
            >
              <Logo className="h-8 w-auto max-w-[110px] object-contain md:h-14 md:max-w-[180px]" />
            </Link>

            <span className="hidden h-8 w-px bg-[#E5E5E5] md:block" aria-hidden />

            <nav className="flex items-center gap-1 rounded-full bg-[#F7F7F7] p-1" aria-label="Main">
              <Link href="/ai-leads" className={tab(active === "leads")} aria-current={active === "leads" ? "page" : undefined}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Leads
              </Link>
              <Link href="/ai-leads/sources" className={tab(active === "sources")} aria-current={active === "sources" ? "page" : undefined}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                </svg>
                Settings
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-2 md:gap-3">
              {aiEnabled !== undefined && (
                <Link
                  href="/ai-leads/sources"
                  title={aiEnabled ? "The AI is contacting leads. Pause it in Settings." : "The AI is paused. Turn it on in Settings."}
                  className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors sm:flex ${
                    aiEnabled
                      ? "border-[#BBE5C8] bg-[#E7F6EC] text-[#15803D] hover:border-[#16A34A]"
                      : "border-[#F8D99B] bg-[#FFF4DB] text-[#B45309] hover:border-[#F59E0B]"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {aiEnabled && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-60 motion-reduce:hidden" />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${aiEnabled ? "bg-[#16A34A]" : "bg-[#F59E0B]"}`} />
                  </span>
                  {aiEnabled ? "AI outreach on" : "AI outreach paused"}
                </Link>
              )}
              <form action={signOut}>
                <PendingButton
                  pendingText="Signing out…"
                  aria-label="Sign out"
                  className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold text-[#525252] transition-colors hover:bg-[#F2F2F2] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  <span className="hidden md:inline">Sign out</span>
                </PendingButton>
              </form>
            </div>
          </header>
        </div>
      </div>

      {/* Charcoal band behind the page title; the first cards overlap its bottom edge */}
      <div className="relative overflow-hidden bg-[#1E1E1E] text-white">
        <span className="pointer-events-none absolute -right-10 top-8 hidden gap-3 opacity-90 md:flex" aria-hidden>
          <span className="h-24 w-6 -skew-x-[20deg] bg-[#E10600]" />
          <span className="h-24 w-6 -skew-x-[20deg] bg-[#E10600]/60" />
          <span className="h-24 w-6 -skew-x-[20deg] bg-[#E10600]/30" />
          <span className="h-24 w-24 -skew-x-[20deg] bg-white/[0.04]" />
        </span>
        <div className={`${CONTAINER} relative pb-24 pt-9 md:pt-11`}>{hero}</div>
      </div>

      <main className={`${CONTAINER} relative -mt-14 pb-12`}>{children}</main>
    </div>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  // Plain <img> so the logo keeps its own proportions whatever size the file is.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={LOGO_SRC} alt="Direct Relocation Services" className={className} />;
}

/** Title block that sits on the charcoal band */
export function HeroTitle({
  title,
  description,
  actions,
  above,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  above?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {above}
        <h1 className={`${display.className} flex items-center gap-3 text-3xl font-extrabold uppercase italic tracking-tight text-white md:text-4xl`}>
          <span className="h-7 w-2 shrink-0 -skew-x-[20deg] bg-[#E10600] md:h-8" aria-hidden />
          {title}
        </h1>
        {description && <div className="mt-2 max-w-2xl text-[15px] text-white/70">{description}</div>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- Status */

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-[#EEF3FB] text-[#1D4ED8]" },
  held: { label: "Waiting for open", cls: "bg-[#F1F1F1] text-[#525252]" },
  active: { label: "In follow-up", cls: "bg-[#FFF4DB] text-[#B45309]" },
  opted_in: { label: "Said yes", cls: "bg-[#FDECEB] text-[#B30500]" },
  transferred: { label: "Transferred", cls: "bg-[#E7F6EC] text-[#15803D]" },
  missed_transfer: { label: "Missed transfer", cls: "bg-[#FFEDD5] text-[#C2410C]" },
  opted_out: { label: "Opted out", cls: "bg-[#262626] text-white" },
  unresponsive: { label: "No response", cls: "bg-[#F1F1F1] text-[#525252]" },
  excluded: { label: "Source off", cls: "bg-[#F1F1F1] text-[#737373]" },
  invalid: { label: "Invalid phone", cls: "bg-[#F1F1F1] text-[#737373]" },
  prefers_contact: { label: "Prefers text", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
};

/** pref = lead.contact_preference ("text" | "email"), used for the "Prefers text / email" label */
export function StatusBadge({ status, pref }: { status: string; pref?: string | null }) {
  const base = STATUS[status] ?? { label: status.replace(/_/g, " "), cls: "bg-[#F1F1F1] text-[#525252]" };
  const s = status === "prefers_contact" && pref === "email" ? { ...base, label: "Prefers email" } : base;
  return (
    <span
      className={`${font.className} inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold not-italic normal-case tracking-normal ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const AVATAR = [
  "bg-[#FDECEB] text-[#B30500]",
  "bg-[#EDEDED] text-[#1E1E1E]",
  "bg-[#FFF4DB] text-[#B45309]",
  "bg-[#E7F6EC] text-[#15803D]",
  "bg-[#EEF3FB] text-[#1D4ED8]",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  const color = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${color} ${
        size === "lg" ? "h-14 w-14 text-lg" : "h-9 w-9 text-xs"
      }`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ---------------------------------------------------------------- Bits */

export function Card({
  title,
  description,
  aside,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.18)] ${className}`}
    >
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-[#F0F0F0] px-5 py-4">
          <div className="flex gap-3">
            <span className="mt-1 h-4 w-1.5 shrink-0 -skew-x-[20deg] bg-[#E10600]" aria-hidden />
            <div>
              <h2 className="text-base font-extrabold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-[#737373]">{description}</p>}
            </div>
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorNote({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  const missing = messages.some((m) => /schema cache|does not exist|relation/i.test(m));
  const denied = messages.some((m) => /permission denied/i.test(m));
  return (
    <div role="alert" className="mb-6 rounded-2xl border border-[#F6C3C0] bg-[#FFF6F5] px-5 py-4 text-sm shadow-sm">
      <p className="font-bold text-[#B30500]">The dashboard can&apos;t read the database.</p>
      <p className="mt-1 text-[#3D3D3D]">
        {missing
          ? "The AI Leads tables aren't in this Supabase project yet. Run npx supabase db push, then refresh."
          : denied
            ? "The service role doesn't have access yet. Push the grants migration (npx supabase db push), then refresh."
            : "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then refresh."}
      </p>
      <p className="mt-1.5 font-mono text-xs text-[#737373]">{messages[0]}</p>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#FDECEB] text-[#E10600]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 6.5h11v8.5h-11z" />
          <path d="M13.5 9.5h4l3.5 3.5v2h-7.5" />
          <circle cx="6.5" cy="17.5" r="1.7" />
          <circle cx="16.5" cy="17.5" r="1.7" />
        </svg>
      </span>
      <p className="font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#737373]">{body}</p>
    </div>
  );
}

export function place(city?: string | null, state?: string | null) {
  return [city, state].filter(Boolean).join(", ");
}

export function moveLine(fromCity?: string | null, fromState?: string | null, toCity?: string | null, toState?: string | null) {
  const from = place(fromCity, fromState);
  const to = place(toCity, toState);
  if (!from && !to) return "";
  return `${from || "Unknown"} to ${to || "Unknown"}`;
}

/* ---------------------------------------------------------------- Format */

const ET = "America/New_York";

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtDuration(sec: number | null | undefined) {
  if (sec === null || sec === undefined) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtPhone(e164: string) {
  const d = e164.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}

export function fullName(first?: string | null, last?: string | null) {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n ? n.replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown caller";
}