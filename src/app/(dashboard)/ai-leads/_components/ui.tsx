// File: app/(dashboard)/ai-leads/_components/ui.tsx
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/_components/ui.tsx)
//
// Palette (Tailwind arbitrary values):
//   hero #4B32D4 (solid, light dot pattern)
//   page #F4F5FB   surface #FFFFFF   border #E6E8F2
//   text #14142B   body #3F4060   muted #6E7191   faint #A0A3BD
//   accent #5A35E0 (hover #4A28C7, tint #F1EDFE)
//   blue #2F6BFF / #EAF1FF   violet #8B5CF6 / #F3EEFF   orange #F59E0B / #FFF5E0   green #10B981 / #E7F8F1
//   rose #E11D48 / #FFEEF1

import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";

export const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const CONTAINER = "mx-auto w-full max-w-[1480px] px-4 md:px-6 xl:px-10";
export const HERO_BG =
  "bg-[#4B32D4] bg-[radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] bg-[length:22px_22px]";

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
    `rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      on ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className={`${font.className} min-h-dvh bg-[#F4F5FB] text-[#14142B] antialiased`}>
      <div className={`${HERO_BG} text-white`}>
        <header className={`${CONTAINER} flex h-16 items-center gap-4 md:gap-8`}>
          <Link href="/ai-leads" className="flex shrink-0 items-center gap-2.5">
            <Mark />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-bold">Direct Relocation</span>
              <span className="block text-xs text-white/70">Lead Response</span>
            </span>
          </Link>

          <nav className="flex gap-1">
            <Link href="/ai-leads" className={tab(active === "leads")}>
              Leads
            </Link>
            <Link href="/ai-leads/sources" className={tab(active === "sources")}>
              Settings
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {aiEnabled !== undefined && (
              <span className="hidden items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold md:flex">
                <span className="relative flex h-2 w-2">
                  {aiEnabled && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6EE7B7] opacity-70 motion-reduce:hidden" />}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${aiEnabled ? "bg-[#6EE7B7]" : "bg-[#FCD34D]"}`} />
                </span>
                {aiEnabled ? "AI outreach on" : "AI outreach paused"}
              </span>
            )}
            <form action={signOut}>
              <button className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className={`${CONTAINER} pb-28 pt-6 md:pt-8`}>{hero}</div>
      </div>

      <main className={`${CONTAINER} relative -mt-20 pb-12`}>{children}</main>
    </div>
  );
}

export function Mark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#5A35E0] shadow-lg shadow-black/10">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 6.5h11v8.5h-11z" />
        <path d="M13.5 9.5h4l3.5 3.5v2h-7.5" />
        <circle cx="6.5" cy="17.5" r="1.7" />
        <circle cx="16.5" cy="17.5" r="1.7" />
      </svg>
    </span>
  );
}

/** Title block that sits on the gradient */
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
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {description && <div className="mt-2 max-w-2xl text-[15px] text-white/80">{description}</div>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- Status */

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-[#EAF1FF] text-[#1F56E0]" },
  held: { label: "Waiting for open", cls: "bg-[#E6F6FD] text-[#0B7AA8]" },
  active: { label: "In follow-up", cls: "bg-[#F3EEFF] text-[#6D3FE6]" },
  opted_in: { label: "Said yes", cls: "bg-[#FFF5E0] text-[#B45309]" },
  transferred: { label: "Transferred", cls: "bg-[#E7F8F1] text-[#047857]" },
  missed_transfer: { label: "Missed transfer", cls: "bg-[#FFEFE3] text-[#C2410C]" },
  opted_out: { label: "Opted out", cls: "bg-[#FFEEF1] text-[#BE123C]" },
  unresponsive: { label: "No response", cls: "bg-[#EEF0F6] text-[#4E5277]" },
  excluded: { label: "Source off", cls: "bg-[#EEF0F6] text-[#6E7191]" },
  invalid: { label: "Invalid phone", cls: "bg-[#EEF0F6] text-[#6E7191]" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status.replace(/_/g, " "), cls: "bg-[#EEF0F6] text-[#4E5277]" };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const AVATAR = [
  "bg-[#EAF1FF] text-[#1F56E0]",
  "bg-[#F3EEFF] text-[#6D3FE6]",
  "bg-[#FFF5E0] text-[#B45309]",
  "bg-[#E7F8F1] text-[#047857]",
  "bg-[#FFEEF1] text-[#BE123C]",
  "bg-[#E6F6FD] text-[#0B7AA8]",
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
    <section className={`rounded-2xl border border-[#E6E8F2] bg-white shadow-[0_1px_2px_rgba(20,20,43,0.04),0_8px_24px_-12px_rgba(46,59,219,0.12)] ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-[#EEF0F6] px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-[#6E7191]">{description}</p>}
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
    <div role="alert" className="mb-6 rounded-2xl border border-[#FECDD6] bg-[#FFF5F7] px-5 py-4 text-sm shadow-sm">
      <p className="font-bold text-[#BE123C]">The dashboard can&apos;t read the database.</p>
      <p className="mt-1 text-[#3F4060]">
        {missing
          ? "The AI Leads tables aren't in this Supabase project yet. Run npx supabase db push, then refresh."
          : denied
            ? "The service role doesn't have access yet. Push the grants migration (npx supabase db push), then refresh."
            : "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then refresh."}
      </p>
      <p className="mt-1.5 font-mono text-xs text-[#6E7191]">{messages[0]}</p>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F1EDFE] text-[#5A35E0]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 6.5h11v8.5h-11z" />
          <path d="M13.5 9.5h4l3.5 3.5v2h-7.5" />
          <circle cx="6.5" cy="17.5" r="1.7" />
          <circle cx="16.5" cy="17.5" r="1.7" />
        </svg>
      </span>
      <p className="font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#6E7191]">{body}</p>
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