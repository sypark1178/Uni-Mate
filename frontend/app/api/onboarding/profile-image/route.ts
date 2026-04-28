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

export async function POST(request: Request) {
  const userKey = resolveUserKey(request);
  const payload = (await request.json()) as { profileImageUrl?: string };
  try {
    const result = await runPythonBridge(
      "save",
      "profile_image",
      { profileImageUrl: String(payload.profileImageUrl || "") },
      userKey
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, source: "fallback", error: "프로필 이미지 저장 중 오류가 발생했습니다." }, { status: 200 });
  }
}
