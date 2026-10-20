// File: app/(dashboard)/ai-leads/_components/source-forms.tsx  (NEW file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/_components/source-forms.tsx)
//
// Lead source rows, "Edit numbers" and "Add a source" forms on the Settings page.
// Mistakes (wrong number, duplicate name) show as a red line under the form, not an error page.

"use client";

import { useActionState, useState } from "react";
import { addSource, saveSourceRouting, toggleSource, type FormState } from "../actions";
import { PendingButton } from "./pending-button";

const initial: FormState = { error: null, ok: false, at: 0 };

const inputCls =
  "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm placeholder:text-[#A3A3A3] focus:outline-none focus:ring-1";

function Message({ state, okText }: { state: FormState; okText: string }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-[#B30500]">
        <span aria-hidden>⚠</span>
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-sm font-medium text-[#15803D]">
        ✓ {okText}
      </p>
    );
  }
  return null;
}

export function SourceNumbersForm({
  name,
  twilio,
  did,
  vapiId,
  defaultFrom,
  defaultDid,
}: {
  name: string;
  twilio: string;
  did: string;
  vapiId: string;
  defaultFrom: string;
  defaultDid: string;
}) {
  const [state, action] = useActionState(saveSourceRouting, initial);
  // After a mistake, keep what the user typed (React clears the form after each submit).
  const v = state.error ? state.values : undefined;

  return (
    <form key={state.at} action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="name" value={name} />
      <Field
        name="twilio_number"
        label="Twilio number"
        hint={`Texts and calls go out from this number. Empty = ${defaultFrom}.`}
        defaultValue={v?.twilio_number ?? twilio}
        placeholder="(954) 555-0100"
        invalid={!!state.error && /Twilio|already used/.test(state.error)}
        tel
      />
      <Field
        name="ringcentral_did"
        label="RingCentral DID"
        hint={`"Yes" calls and inbound calls go here. Empty = ${defaultDid}.`}
        defaultValue={v?.ringcentral_did ?? did}
        placeholder="(954) 555-0199"
        invalid={!!state.error && /RingCentral/.test(state.error)}
        tel
      />
      <Field
        name="vapi_phone_number_id"
        label="Vapi number ID"
        hint="Set by your developer after the Twilio number is connected to Vapi."
        defaultValue={v?.vapi_phone_number_id ?? vapiId}
        placeholder="a81de8a7-…"
        mono
      />
      <div className="flex flex-col justify-end gap-2">
        <PendingButton
          tone="light"
          pendingText="Saving…"
          className="w-fit rounded-xl bg-[#E10600] px-4 py-2 text-sm font-medium text-white hover:bg-[#C00500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
        >
          Save numbers
        </PendingButton>
      </div>
      <div className="sm:col-span-2">
        <Message state={state} okText="Numbers saved." />
      </div>
    </form>
  );
}

export function AddSourceForm() {
  const [state, action] = useActionState(addSource, initial);
  const v = state.error ? state.values : undefined;

  return (
    <form key={state.at} action={action} className="mt-4 space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-[#3D3D3D]">Add a source</span>
          <input
            name="name"
            required
            defaultValue={v?.name ?? ""}
            placeholder="Exact name as Granot sends it"
            className={`${inputCls} ${state.error ? "border-[#E10600] focus:ring-[#E10600]" : "border-[#D4D4D4] focus:border-[#E10600] focus:ring-[#E10600]"}`}
          />
        </label>
        <PendingButton
          pendingText="Adding…"
          className="rounded-xl border border-[#D4D4D4] bg-white px-4 py-2 text-sm font-medium text-[#3D3D3D] hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
        >
          Add source
        </PendingButton>
      </div>
      <Message state={state} okText="Source added. It's switched on." />
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  defaultValue,
  placeholder,
  mono = false,
  tel = false,
  invalid = false,
}: {
  name: string;
  label: string;
  hint: string;
  defaultValue: string;
  placeholder: string;
  mono?: boolean;
  tel?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-medium text-[#3D3D3D]">{label}</span>
      <input
        name={name}
        type={tel ? "tel" : "text"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={`${inputCls} ${
          invalid ? "border-[#E10600] focus:ring-[#E10600]" : "border-[#D4D4D4] focus:border-[#E10600] focus:ring-[#E10600]"
        } ${mono ? "font-mono text-xs" : "tabular-nums"}`}
      />
      <span className="mt-1 block text-xs text-[#737373]">{hint}</span>
    </label>
  );
}

/* ---------------------------------------------------------------- Source row */

export interface SourceRowData {
  name: string;
  enabled: boolean;
  note: string | null;
  firstSeen: string;
  twilio: string | null;
  did: string | null;
  vapiId: string | null;
}

/** "+19545695292" → "(954) 569-5292" */
export function fmtPhone(e164: string | null | undefined) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 || null;
}

export function SourceRow({ s, defaultFrom, defaultDid }: { s: SourceRowData; defaultFrom: string; defaultDid: string }) {
  const [open, setOpen] = useState(false);
  const from = fmtPhone(s.twilio);
  const to = fmtPhone(s.did);
  const panelId = `edit-${s.name.replace(/\W+/g, "-")}`;

  return (
    <li className={`transition-colors ${open ? "bg-[#FCFCFC]" : "hover:bg-[#FCFCFC]"}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[44px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_84px]">
        {/* On / off */}
        <form action={toggleSource}>
          <input type="hidden" name="name" value={s.name} />
          <input type="hidden" name="enabled" value={s.enabled ? "false" : "true"} />
          <PendingButton
            indicator="none"
            role="switch"
            aria-checked={s.enabled}
            aria-label={`Contact leads from ${s.name}`}
            className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
              s.enabled ? "bg-[#E10600]" : "bg-[#D4D4D4]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${s.enabled ? "left-[22px]" : "left-0.5"}`}
            />
          </PendingButton>
        </form>

        {/* Name */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`truncate text-sm font-bold ${s.enabled ? "text-[#171717]" : "text-[#737373]"}`}>{s.name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                s.enabled ? "bg-[#E7F6EC] text-[#15803D]" : "bg-[#F1F1F1] text-[#737373]"
              }`}
            >
              {s.enabled ? "AI contacts" : "Not contacted"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#737373]">{s.note ?? `First lead ${s.firstSeen}`}</p>
        </div>

        {/* Numbers (desktop columns) */}
        <Num label="Texts & calls from" value={from} fallback={defaultFrom} className="hidden md:block" bare />
        <Num label="Transfers to" value={to} fallback={defaultDid} className="hidden md:block" bare />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`inline-flex cursor-pointer items-center justify-center justify-self-end md:w-[84px] gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600] ${
            open ? "border-[#1E1E1E] bg-[#1E1E1E] text-white" : "border-[#E5E5E5] bg-white text-[#3D3D3D] hover:border-[#D4D4D4] hover:bg-[#FAFAFA]"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />}
          </svg>
          {open ? "Close" : "Edit"}
        </button>

        {/* Numbers (mobile, under the name) */}
        <div className="col-span-3 grid grid-cols-2 gap-3 md:hidden">
          <Num label="Texts & calls from" value={from} fallback={defaultFrom} />
          <Num label="Transfers to" value={to} fallback={defaultDid} />
        </div>
      </div>

      {open && (
        <div id={panelId} className="border-t border-dashed border-[#E5E5E5] px-5 pb-5">
          <SourceNumbersForm
            name={s.name}
            twilio={from ?? ""}
            did={to ?? ""}
            vapiId={s.vapiId ?? ""}
            defaultFrom={defaultFrom}
            defaultDid={defaultDid}
          />
        </div>
      )}
    </li>
  );
}

function Num({
  label,
  value,
  fallback,
  className = "",
  bare = false,
}: {
  label: string;
  value: string | null;
  fallback: string;
  className?: string;
  /** Desktop table: the column header already shows the label */
  bare?: boolean;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {!bare && <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>}
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm tabular-nums">
        <span className={value ? "font-semibold text-[#171717]" : "text-[#737373]"}>{value ?? fallback}</span>
        {!value && <span className="rounded bg-[#F1F1F1] px-1.5 py-px text-[10px] font-bold uppercase text-[#737373]">Default</span>}
      </p>
    </div>
  );
}