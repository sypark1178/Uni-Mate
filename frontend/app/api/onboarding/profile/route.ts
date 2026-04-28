import { NextResponse } from "next/server";
import { readRequestJson } from "@/lib/read-json-response";
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
    const result = await runPythonBridge("get", "profile", undefined, userKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", data: null });
  }
}

export async function POST(request: Request) {
  const userKey = resolveUserKey(request);
  const payload = await readRequestJson<unknown>(request);
  if (payload === null) {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
  try {
    const result = await runPythonBridge("save", "profile", payload, userKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
