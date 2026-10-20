// File: app/(dashboard)/ai-leads/_components/pending-button.tsx  (NEW file)
// (If your project uses a src/ folder, put it in src/app/(dashboard)/ai-leads/_components/pending-button.tsx)
//
// Submit button for server-action forms. While the action runs it shows a spinner and
// "pendingText", is disabled, and uses the wait cursor. When it finishes it can briefly show "doneText".
// Must be placed INSIDE a <form action={...}>.

"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: ReactNode;
  doneText?: ReactNode;
  /** "spinner" (default) shows a spinner next to the text. "none" only dims the button (for switches). */
  indicator?: "spinner" | "none";
  /** Spinner colour: "light" for dark/red buttons, "dark" for white buttons. */
  tone?: "light" | "dark";
};

export function PendingButton({
  children,
  pendingText,
  doneText,
  indicator = "spinner",
  tone = "dark",
  className = "",
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const [done, setDone] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setDone(false);
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      if (doneText) {
        setDone(true);
        const t = setTimeout(() => setDone(false), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [pending, doneText]);

  const spinner =
    tone === "light"
      ? "border-white/40 border-t-white"
      : "border-[#D4D4D4] border-t-[#E10600]";

  return (
    <button
      type="submit"
      {...rest}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`cursor-pointer disabled:cursor-wait ${
        indicator === "none" ? "disabled:animate-pulse disabled:opacity-60" : "inline-flex items-center justify-center gap-2 disabled:opacity-80"
      } ${className}`}
    >
      {indicator === "spinner" && pending && (
        <span className={`h-4 w-4 shrink-0 animate-spin rounded-full border-2 ${spinner}`} aria-hidden />
      )}
      {indicator === "spinner" && pending && pendingText
        ? pendingText
        : done && doneText
          ? doneText
          : children}
    </button>
  );
}