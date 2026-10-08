// File: app/login/actions.ts
// (If your project uses a src/ folder, put it in src/app/login/actions.ts)

"use server";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/ai-leads/auth";

export interface LoginState {
  error: string | null;
  email: string;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/ai-leads";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = /invalid login credentials/i.test(error.message)
      ? "That email and password don't match an account."
      : /email not confirmed/i.test(error.message)
        ? "This account isn't confirmed yet. Ask your admin to confirm it in Supabase."
        : error.message;
    return { error: message, email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}