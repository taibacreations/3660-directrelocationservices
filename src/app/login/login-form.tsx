// File: app/login/login-form.tsx
// (If your project uses a src/ folder, put it in src/app/login/login-form.tsx)

"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type LoginState } from "./actions";

const initial: LoginState = { error: null, email: "" };

const input =
  "w-full rounded-xl border border-[#E6E8F2] bg-[#F7F7FC] px-4 py-3 text-sm text-[#14142B] placeholder:text-[#A0A3BD] focus:border-[#5A35E0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A35E0]/20";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(signIn, initial);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p role="alert" className="rounded-xl border border-[#FECDD6] bg-[#FFF5F7] px-3.5 py-2.5 text-sm text-[#BE123C]">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#3F4060]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.email}
          placeholder="name@directrelocate.com"
          className={input}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-[#3F4060]">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-sm font-medium text-[#5A35E0] hover:text-[#4A28C7]"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className={input}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4B32D4] px-4 py-3 text-sm font-bold shadow-lg shadow-[#4B32D4]/30 text-white transition-colors hover:bg-[#3E27B8] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A35E0]"
      >
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}