import { NextResponse } from "next/server";
import { readRequestJson } from "@/lib/read-json-response";
import { runPythonDbQuery } from "@/lib/python-bridge";

export const runtime = "nodejs";

type QueryPayload = {
  sql?: unknown;
  maxRows?: unknown;
};

export async function GET() {
  try {
    const result = await runPythonDbQuery("tables");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "sqlite",
        error: error instanceof Error ? error.message : "테이블 목록 조회에 실패했습니다."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = await readRequestJson<QueryPayload>(request);
  if (payload === null) {
    return NextResponse.json(
      {
        ok: false,
        source: "sqlite",
        error: "요청 본문이 올바르지 않습니다."
      },
      { status: 400 }
    );
  }

  try {
    const result = (await runPythonDbQuery("query", payload)) as { ok?: boolean };
    return NextResponse.json(result, { status: result.ok === false ? 400 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "sqlite",
        error: error instanceof Error ? error.message : "쿼리 실행에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
