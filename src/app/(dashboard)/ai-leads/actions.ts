// File: app/(dashboard)/ai-leads/actions.ts
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/actions.ts)

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ai-leads/auth";
import { db, rpc } from "@/lib/ai-leads/supabase";

// These run with the service-role key, so each one checks that someone is signed in first.

export async function toggleSource(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name"));
  const enabled = formData.get("enabled") === "true";
  const { error } = await db().from("ai_lead_sources").update({ enabled }).eq("name", name);
  if (error) throw new Error(error.message);
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