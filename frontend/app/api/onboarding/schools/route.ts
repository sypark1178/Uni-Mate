import { NextResponse } from "next/server";
import { fetchNeisSchools } from "@/lib/neis-school";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const region = url.searchParams.get("region")?.trim() ?? "";
    const district = url.searchParams.get("district")?.trim() ?? "";
    const gradeLabel = url.searchParams.get("gradeLabel")?.trim() ?? "";

    if (!region) {
      return NextResponse.json({ ok: false, message: "region 파라미터가 필요합니다." }, { status: 400 });
    }

    const data = await fetchNeisSchools({ region, district, gradeLabel });
    return NextResponse.json({ ok: true, source: "neis", data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ ok: false, source: "fallback", message }, { status: 200 });
  }
}

