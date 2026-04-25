import { NextResponse } from "next/server";
import { runPythonLogin } from "@/lib/python-bridge";

export const runtime = "nodejs";

type LoginResult = {
  ok?: boolean;
  error?: string;
  data?: {
    userId: string;
    name: string;
    email: string;
  };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { loginId?: unknown; password?: unknown };
    const result = (await runPythonLogin({
      loginId: String(payload.loginId ?? ""),
      password: String(payload.password ?? "")
    })) as LoginResult;

    return NextResponse.json(result, { status: result.ok ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "서버 로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
