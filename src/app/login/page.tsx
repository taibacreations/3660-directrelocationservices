// File: app/login/page.tsx
// (If your project uses a src/ folder, put it in src/app/login/page.tsx)

import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { LoginForm } from "./login-form";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = { title: "Sign in | DRS Lead Response" };

export default function LoginPage() {
  return (
    <div
      className={`${font.className} flex min-h-dvh flex-col bg-[#F4F5FB] text-[#14142B] antialiased`}
    >
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#4B32D4] text-white shadow-lg shadow-[#4B32D4]/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 6.5h11v8.5h-11z" />
                <path d="M13.5 9.5h4l3.5 3.5v2h-7.5" />
                <circle cx="6.5" cy="17.5" r="1.7" />
                <circle cx="16.5" cy="17.5" r="1.7" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold">Direct Relocation</span>
              <span className="block text-sm text-[#6E7191]">Lead Response</span>
            </span>
          </div>

          <div className="rounded-3xl border border-[#E6E8F2] bg-white px-6 py-8 shadow-[0_24px_48px_-24px_rgba(75,50,212,0.35)] sm:px-9">
            <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mb-7 mt-1 text-sm text-[#6E7191]">Sign in with the email and password your admin set up.</p>
            <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-[#EEF0F6]" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-sm text-[#6E7191]">Forgot your password? Ask your admin to reset it.</p>
        </div>
      </main>
    </div>
  );
}