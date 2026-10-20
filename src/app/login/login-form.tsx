// File: app/login/login-form.tsx  (REPLACE existing file)
// (If your project uses a src/ folder, put it in src/app/login/login-form.tsx)

"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type LoginState } from "./actions";

const initial: LoginState = { error: null, email: "" };

const input =
  "w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#E10600] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E10600]/20";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(signIn, initial);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p role="alert" className="rounded-xl border border-[#F6C3C0] bg-[#FFF6F5] px-3.5 py-2.5 text-sm text-[#B30500]">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#3D3D3D]">
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
          <label htmlFor="password" className="text-sm font-medium text-[#3D3D3D]">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="cursor-pointer text-sm font-medium text-[#E10600] hover:text-[#C00500]"
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
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E10600] px-4 py-3 text-sm font-bold shadow-lg shadow-[#E10600]/30 text-white transition-colors hover:bg-[#C00500] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E10600]"
      >
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}