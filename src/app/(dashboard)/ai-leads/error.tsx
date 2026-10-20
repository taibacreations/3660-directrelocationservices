// File: app/(dashboard)/ai-leads/error.tsx  (NEW file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/error.tsx)
//
// Friendly screen for unexpected errors on the AI Leads pages, instead of a crash page.

"use client";

import Link from "next/link";

export default function AiLeadsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F5F5F5] px-4 text-[#171717]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white text-center shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]">
        <div className="h-1.5 bg-[#E10600]" />
        <div className="px-6 py-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#FDECEB] text-xl text-[#E10600]" aria-hidden>
            !
          </span>
          <h1 className="text-lg font-extrabold">Something went wrong</h1>
          <p className="mt-1 text-sm text-[#737373]">Nothing was lost. Please try again. If it keeps happening, let your developer know.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-xl bg-[#E10600] px-4 py-2 text-sm font-bold text-white hover:bg-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
            >
              Try again
            </button>
            <Link
              href="/ai-leads"
              className="rounded-xl border border-[#D4D4D4] px-4 py-2 text-sm font-bold text-[#3D3D3D] hover:bg-[#FAFAFA]"
            >
              Back to leads
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}