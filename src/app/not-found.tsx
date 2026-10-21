// File: src/app/not-found.tsx  (NEW file)
//
// Shown for any page that doesn't exist, and when a lead id is not found (notFound()).

import Link from "next/link";
import { display, font } from "./(dashboard)/ai-leads/_components/ui";

export default function NotFound() {
  return (
    <div className={`${font.className} grid min-h-dvh place-items-center bg-[#F5F5F5] px-4 text-[#171717] antialiased`}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white text-center shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]">
        <div className="relative overflow-hidden bg-[#1E1E1E] px-6 py-8 text-white">
          <span className="absolute inset-x-0 top-0 h-1 bg-[#E10600]" aria-hidden />
          <span className="pointer-events-none absolute -right-6 top-5 flex gap-2 opacity-90" aria-hidden>
            <span className="h-16 w-4 -skew-x-[20deg] bg-[#E10600]" />
            <span className="h-16 w-4 -skew-x-[20deg] bg-[#E10600]/60" />
            <span className="h-16 w-4 -skew-x-[20deg] bg-[#E10600]/30" />
          </span>
          <p className={`${display.className} text-7xl font-extrabold italic tracking-tight`}>404</p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-white/60">Page not found</p>
        </div>

        <div className="px-6 py-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#FDECEB] text-[#E10600]" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 6.5h11v8.5h-11z" />
              <path d="M13.5 9.5h4l3.5 3.5v2h-7.5" />
              <circle cx="6.5" cy="17.5" r="1.7" />
              <circle cx="16.5" cy="17.5" r="1.7" />
            </svg>
          </span>
          <h1 className="text-lg font-extrabold">This page moved out</h1>
          <p className="mt-1 text-sm text-[#737373]">
            The page or lead you&apos;re looking for doesn&apos;t exist, or it was removed.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/ai-leads"
              className="cursor-pointer rounded-xl bg-[#E10600] px-4 py-2 text-sm font-bold text-white hover:bg-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
            >
              Back to leads
            </Link>
            <Link
              href="/ai-leads/sources"
              className="cursor-pointer rounded-xl border border-[#D4D4D4] px-4 py-2 text-sm font-bold text-[#3D3D3D] hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}