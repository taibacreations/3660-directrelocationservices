// File: src/app/(dashboard)/ai-leads/loading.tsx  (REPLACE existing file)
// Loading state for the AI Leads pages (also the Suspense boundary cacheComponents needs).

import { Shell } from "./_components/ui";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#F0F0F0] ${className}`} />;
}

const TINTS = ["bg-[#EDEDED]", "bg-[#FFF4DB]", "bg-[#FDECEB]", "bg-[#E7F6EC]"];

export default function Loading() {
  return (
    <Shell
      active={null}
      hero={
        <div className="animate-pulse">
          <div className="h-9 w-40 rounded-lg bg-white/15" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-white/10" />
        </div>
      }
    >
      <div role="status" aria-label="Loading">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TINTS.map((t) => (
            <div key={t} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between">
                <Bar className="h-4 w-20" />
                <div className={`h-10 w-10 animate-pulse rounded-xl ${t}`} />
              </div>
              <Bar className="mt-3 h-9 w-20" />
              <div className={`mt-4 h-1.5 animate-pulse rounded-full ${t}`} />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#E5E5E5] bg-white xl:col-span-3">
            <div className="flex gap-2 border-b border-[#F0F0F0] p-4">
              {[0, 1, 2, 3].map((i) => (
                <Bar key={i} className="h-8 w-20" />
              ))}
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-[#F0F0F0]" />
                  <Bar className="h-4 w-36" />
                  <Bar className="hidden h-4 flex-1 md:block" />
                  <Bar className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="self-start rounded-2xl border border-[#E5E5E5] bg-white p-5">
            <Bar className="h-5 w-32" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="mt-5">
                <Bar className="h-4 w-full" />
                <Bar className="mt-2 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </Shell>
  );
}