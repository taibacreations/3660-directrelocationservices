// File: src/app/(dashboard)/ai-leads/recording/[callId]/route.ts  (NEW file)
//
// Plays a Vapi call recording. Vapi keeps recordings in private storage, so the saved
// recording_url can't be opened directly. This route asks Vapi (with the private API key,
// server side only) for a short-lived signed link and sends the browser there.
// Only signed-in dashboard users reach this route (proxy.ts protects every page).

import { NextResponse } from "next/server";

const CALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  const key = process.env.VAPI_API_KEY;

  if (!CALL_ID.test(callId)) {
    return new NextResponse("Bad call id", { status: 400 });
  }
  if (!key) {
    return new NextResponse("VAPI_API_KEY is not set in Vercel", { status: 500 });
  }

  const res = await fetch(`https://api.vapi.ai/call/${callId}/mono-recording`, {
    headers: { Authorization: `Bearer ${key}` },
    redirect: "manual",
    cache: "no-store",
  });

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) {
    return NextResponse.redirect(location, 302);
  }

  return new NextResponse("Recording not available yet", { status: res.status === 404 ? 404 : 502 });
}