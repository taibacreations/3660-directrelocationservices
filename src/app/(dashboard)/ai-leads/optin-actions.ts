// File: src/app/(dashboard)/ai-leads/optin-actions.ts  (NEW file)
//
// Admin button on the lead page: takes a number off the AI opt-out list again.

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/ai-leads/auth";
import { db } from "@/lib/ai-leads/supabase";

export async function manualOptIn(formData: FormData): Promise<void> {
  await requireUser();
  const phone = String(formData.get("phone") ?? "").trim();
  const leadId = String(formData.get("leadId") ?? "").trim();
  if (!phone) return;

  const { error } = await db().rpc("ai_opt_in_phone", { p_phone: phone, p_keyword: "admin" });
  if (error) throw new Error("Couldn't re-enable this number. Please try again.");

  revalidatePath("/ai-leads");
  if (leadId) revalidatePath(`/ai-leads/${leadId}`);
}