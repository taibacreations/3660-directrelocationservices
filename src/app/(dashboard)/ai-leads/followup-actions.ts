// File: src/app/(dashboard)/ai-leads/followup-actions.ts  (NEW file)
//
// Saves the follow-up sequence settings (attempts per day, text-to-call wait, duplicate window).

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ai-leads/auth";
import { db } from "@/lib/ai-leads/supabase";
import type { FormState } from "./actions";

function whole(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

export async function saveFollowup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const at = Date.now();

  const days = Array.from({ length: 7 }, (_, i) => whole(formData.get(`day${i + 1}`)));
  if (days.some((n) => Number.isNaN(n) || n < 0 || n > 5)) {
    return { error: "Attempts per day must be a whole number from 0 to 5.", ok: false, at, values };
  }
  if (days.every((n) => n === 0)) {
    return { error: "At least one day needs an attempt.", ok: false, at, values };
  }

  const wait = whole(formData.get("wait"));
  if (Number.isNaN(wait) || wait < 1 || wait > 60) {
    return { error: "Text-to-call wait must be between 1 and 60 minutes.", ok: false, at, values };
  }

  const dedupe = whole(formData.get("dedupe"));
  if (Number.isNaN(dedupe) || dedupe < 0 || dedupe > 1440) {
    return { error: "Duplicate window must be between 0 and 1440 minutes.", ok: false, at, values };
  }

  const { error } = await db()
    .from("ai_settings")
    .update({ seq_attempts: days, text_to_call_minutes: wait, dedupe_minutes: dedupe, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    return { error: "Couldn't save. Please try again.", ok: false, at, values };
  }

  revalidatePath("/ai-leads/sources");
  return { error: null, ok: true, at };
}