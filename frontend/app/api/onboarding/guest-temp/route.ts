import { NextResponse } from "next/server";
import { readRequestJson } from "@/lib/read-json-response";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contactType = url.searchParams.get("contactType") ?? "";
  const contactId = url.searchParams.get("contactId") ?? "";
  try {
    const result = await runPythonBridge("get", "guest_temp", { contactType, contactId }, "guest-temp");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, source: "fallback", error: "임시 저장 조회에 실패했습니다." }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const payload = await readRequestJson<unknown>(request);
  if (payload === null) {
    return NextResponse.json({ ok: false, source: "fallback", error: "요청 본문이 올바르지 않습니다." }, { status: 200 });
  }
  try {
    const result = await runPythonBridge("save", "guest_temp", payload, "guest-temp");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, source: "fallback", error: "임시 저장에 실패했습니다." }, { status: 200 });
  }
}

