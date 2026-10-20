// File: app/(dashboard)/ai-leads/actions.ts  (REPLACE existing file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/actions.ts)

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ai-leads/auth";
import { db, rpc } from "@/lib/ai-leads/supabase";

// These run with the service-role key, so each one checks that someone is signed in first.

/** Result of a settings form. The page shows `error` next to the form instead of crashing. */
export type FormState = {
  error: string | null;
  ok: boolean;
  at: number;
  values?: Record<string, string>;
};

/** "(954) 569-5292" / "9545695292" / "+1 954…" → "+19545695292". Empty → null. Bad → "invalid". */
function toE164(value: FormDataEntryValue | null): string | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return "invalid";
}

export async function toggleSource(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name"));
  const enabled = formData.get("enabled") === "true";
  const { error } = await db().from("ai_lead_sources").update({ enabled }).eq("name", name);
  if (error) throw new Error(error.message);
  revalidatePath("/ai-leads/sources");
}

export async function saveSourceRouting(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = {
    twilio_number: String(formData.get("twilio_number") ?? ""),
    ringcentral_did: String(formData.get("ringcentral_did") ?? ""),
    vapi_phone_number_id: String(formData.get("vapi_phone_number_id") ?? ""),
  };
  const fail = (error: string): FormState => ({ error, ok: false, at: Date.now(), values });

  const name = String(formData.get("name"));
  const twilio_number = toE164(values.twilio_number);
  const ringcentral_did = toE164(values.ringcentral_did);
  const vapi_phone_number_id = values.vapi_phone_number_id.trim() || null;
  if (twilio_number === "invalid") return fail("Twilio number must be a 10-digit US number.");
  if (ringcentral_did === "invalid") return fail("RingCentral DID must be a 10-digit US number.");

  const { error } = await db()
    .from("ai_lead_sources")
    .update({ twilio_number, ringcentral_did, vapi_phone_number_id })
    .eq("name", name);
  if (error) {
    if (error.code === "23505") return fail(`${values.twilio_number} is already used by another source.`);
    return fail(`Couldn't save: ${error.message}`);
  }
  revalidatePath("/ai-leads/sources");
  revalidatePath("/ai-leads");
  return { error: null, ok: true, at: Date.now() };
}

export async function addSource(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const fail = (error: string): FormState => ({ error, ok: false, at: Date.now(), values: { name } });
  if (!name) return fail("Please type the source name.");
  // Must match the lead source name exactly as Granot / the website sends it
  const { error } = await db().from("ai_lead_sources").insert({ name, enabled: true });
  if (error) {
    if (error.code === "23505") return fail(`"${name}" is already in the list.`);
    return fail(`Couldn't add: ${error.message}`);
  }
  revalidatePath("/ai-leads/sources");
  return { error: null, ok: true, at: Date.now() };
}

export async function setAiEnabled(formData: FormData) {
  await requireUser();
  const enabled = formData.get("enabled") === "true";
  const { error } = await db()
    .from("ai_settings")
    .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/ai-leads/sources");
  revalidatePath("/ai-leads");
}

export async function setDisclosure(formData: FormData) {
  await requireUser();
  const mode = String(formData.get("mode"));
  if (!["off", "california", "all"].includes(mode)) throw new Error("Invalid disclosure mode");
  const { error } = await db()
    .from("ai_settings")
    .update({ ai_disclosure: mode, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/ai-leads/sources");
}

export async function manualOptOut(formData: FormData) {
  await requireUser();
  const phone = String(formData.get("phone"));
  const leadId = String(formData.get("leadId"));
  await rpc("ai_opt_out_phone", { p_phone: phone, p_channel: "admin", p_keyword: "dashboard", p_lead: leadId });
  revalidatePath(`/ai-leads/${leadId}`);
  revalidatePath("/ai-leads");
}