// File: app/(dashboard)/ai-leads/actions.ts  (REPLACE existing file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/actions.ts)

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ai-leads/auth";
import { db, rpc } from "@/lib/ai-leads/supabase";

// These run with the service-role key, so each one checks that someone is signed in first.

/** "(954) 569-5292" / "9545695292" / "+1 954…" → "+19545695292". Empty → null. */
function toE164(value: FormDataEntryValue | null, label: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  throw new Error(`${label} must be a 10-digit US number`);
}

export async function toggleSource(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name"));
  const enabled = formData.get("enabled") === "true";
  const { error } = await db().from("ai_lead_sources").update({ enabled }).eq("name", name);
  if (error) throw new Error(error.message);
  revalidatePath("/ai-leads/sources");
}

export async function saveSourceRouting(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name"));
  const twilio_number = toE164(formData.get("twilio_number"), "Twilio number");
  const ringcentral_did = toE164(formData.get("ringcentral_did"), "RingCentral DID");
  const vapi_phone_number_id = String(formData.get("vapi_phone_number_id") ?? "").trim() || null;

  const { error } = await db()
    .from("ai_lead_sources")
    .update({ twilio_number, ringcentral_did, vapi_phone_number_id })
    .eq("name", name);
  if (error) {
    if (error.code === "23505") throw new Error(`${twilio_number} is already used by another source`);
    throw new Error(error.message);
  }
  revalidatePath("/ai-leads/sources");
  revalidatePath("/ai-leads");
}

export async function addSource(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Source name is required");
  // Must match the lead source name exactly as Granot / the website sends it
  const { error } = await db().from("ai_lead_sources").insert({ name, enabled: true });
  if (error) {
    if (error.code === "23505") throw new Error(`"${name}" already exists`);
    throw new Error(error.message);
  }
  revalidatePath("/ai-leads/sources");
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