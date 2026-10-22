// File: src/app/(dashboard)/ai-leads/_components/followup-form.tsx  (NEW file)
//
// "Follow-up sequence" form on the Settings page.

"use client";

import { useActionState } from "react";
import type { FormState } from "../actions";
import { saveFollowup } from "../followup-actions";
import { PendingButton } from "./pending-button";

const initial: FormState = { error: null, ok: false, at: 0 };

const inputCls =
  "w-full rounded-xl border bg-white px-2 py-2 text-center text-sm font-bold tabular-nums focus:outline-none focus:ring-1";

export function FollowupForm({ attempts, wait, dedupe }: { attempts: number[]; wait: number; dedupe: number }) {
  const [state, action] = useActionState(saveFollowup, initial);
  const v = state.error ? state.values : undefined;
  const bad = !!state.error;
  const total = attempts.reduce((a, b) => a + b, 0);

  return (
    <form key={state.at} action={action} className="space-y-5 p-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#737373]">Attempts per business day</p>
          <p className="text-xs text-[#737373]">
            {total} attempts over 7 business days
          </p>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {attempts.map((n, i) => (
            <label key={i} className="block">
              <span className="mb-1 block text-center text-[11px] font-semibold text-[#A3A3A3]">Day {i + 1}</span>
              <input
                name={`day${i + 1}`}
                type="number"
                min={0}
                max={5}
                inputMode="numeric"
                defaultValue={v?.[`day${i + 1}`] ?? n}
                aria-label={`Day ${i + 1} attempts`}
                className={`${inputCls} ${bad ? "border-[#E10600] focus:ring-[#E10600]" : "border-[#D4D4D4] focus:border-[#E10600] focus:ring-[#E10600]"}`}
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-[#737373]">
          Each attempt is a text, then an AI call if there&apos;s no reply. 3 a day → opening, midday, late afternoon. 2 → opening and
          late afternoon. 1 → two hours after opening. Stops when the customer is transferred, books a time, picks text/email or opts
          out.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-[#737373]">Text-to-call wait</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              name="wait"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              defaultValue={v?.wait ?? wait}
              className={`${inputCls} max-w-[90px] ${bad ? "border-[#E10600] focus:ring-[#E10600]" : "border-[#D4D4D4] focus:border-[#E10600] focus:ring-[#E10600]"}`}
            />
            <span className="text-sm text-[#525252]">minutes</span>
          </span>
          <span className="mt-1 block text-xs text-[#737373]">The AI calls this long after the text, even if the text is blocked.</span>
        </label>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-[#737373]">Duplicate window</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              name="dedupe"
              type="number"
              min={0}
              max={1440}
              inputMode="numeric"
              defaultValue={v?.dedupe ?? dedupe}
              className={`${inputCls} max-w-[90px] ${bad ? "border-[#E10600] focus:ring-[#E10600]" : "border-[#D4D4D4] focus:border-[#E10600] focus:ring-[#E10600]"}`}
            />
            <span className="text-sm text-[#525252]">minutes</span>
          </span>
          <span className="mt-1 block text-xs text-[#737373]">
            Same number inside this window counts as one lead. After it, a new submission starts the AI again.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PendingButton
          tone="light"
          pendingText="Saving…"
          className="rounded-xl bg-[#E10600] px-4 py-2 text-sm font-bold text-white hover:bg-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
        >
          Save follow-up
        </PendingButton>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-[#B30500]">
            ⚠ {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-sm font-medium text-[#15803D]">
            ✓ Saved. New leads use these settings.
          </p>
        )}
      </div>
    </form>
  );
}