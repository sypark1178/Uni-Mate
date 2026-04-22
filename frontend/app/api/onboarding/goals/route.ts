import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await runPythonBridge("get", "goals");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", data: [] });
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  try {
    const result = await runPythonBridge("save", "goals", payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
