// File: app/login/page.tsx

import type { Metadata } from "next";
import { Suspense } from "react";
import { Barlow, Plus_Jakarta_Sans } from "next/font/google";
import { LoginForm } from "./login-form";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const display = Barlow({ subsets: ["latin"], weight: ["700", "800"], style: ["italic"], display: "swap" });

export const metadata: Metadata = { title: "Sign in | DRS Lead Response" };

export default function LoginPage() {
  return (
    <div className={`${font.className} relative flex min-h-dvh flex-col bg-[#F5F5F5] text-[#171717] antialiased`}>
      {/* Charcoal band behind the card, same as the dashboard */}
      <div className="absolute inset-x-0 top-0 h-[42dvh] overflow-hidden bg-[#1E1E1E]" aria-hidden>
        <span className="absolute inset-x-0 top-0 h-1 bg-[#E10600]" />
        <span className="absolute -right-8 top-10 flex gap-3">
          <span className="h-28 w-7 -skew-x-[20deg] bg-[#E10600]" />
          <span className="h-28 w-7 -skew-x-[20deg] bg-[#E10600]/60" />
          <span className="h-28 w-7 -skew-x-[20deg] bg-[#E10600]/30" />
        </span>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="overflow-hidden rounded-3xl border border-[#E5E5E5] bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
            <div className="h-1.5 bg-[#E10600]" />
            <div className="px-6 pb-8 pt-8 sm:px-9">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.webp" alt="Direct Relocation Services" className="mx-auto h-14 w-auto max-w-[260px] object-contain" />

              <div className="my-7 h-px bg-[#F0F0F0]" />

              <h1 className={`${display.className} text-3xl font-extrabold uppercase italic tracking-tight`}>Welcome back</h1>
              <p className="mb-7 mt-1 text-sm text-[#737373]">Sign in to the Lead Response dashboard.</p>
              <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-[#F0F0F0]" />}>
                <LoginForm />
              </Suspense>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-[#737373]">Forgot your password? Ask your admin to reset it.</p>
        </div>
      </main>
    </div>
  );
}