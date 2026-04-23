import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

function resolveUserKey(request: Request) {
  const fromHeader = request.headers.get("x-user-key")?.trim();
  if (fromHeader) return fromHeader;
  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("userKey")?.trim();
    if (fromQuery) return fromQuery;
  } catch {
    // no-op
  }
  return "local-user";
}

export async function GET(request: Request) {
  const userKey = resolveUserKey(request);
  try {
    const result = await runPythonBridge("get", "analysis", undefined, userKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", data: null });
  }
}

export async function POST(request: Request) {
  const userKey = resolveUserKey(request);
  const payload = await request.json();
  try {
    const result = await runPythonBridge("save", "analysis", payload, userKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
