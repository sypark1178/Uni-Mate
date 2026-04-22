import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await runPythonBridge("get", "analysis");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", data: null });
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  try {
    const result = await runPythonBridge("save", "analysis", payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
