import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { readRequestJson } from "@/lib/read-json-response";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

const fallbackDataDirectory = path.join(process.cwd(), ".data");
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

function buildFallbackDataPath(userKey: string) {
  const safe = userKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(fallbackDataDirectory, `onboarding-scores-${safe}.json`);
}

export async function GET(request: Request) {
  const userKey = resolveUserKey(request);
  const dataPath = buildFallbackDataPath(userKey);
  try {
    const result = await runPythonBridge("get", "scores", undefined, userKey);
    return NextResponse.json(result);
  } catch {
    try {
      const raw = await fs.readFile(dataPath, "utf8");
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({ ok: true, source: "fallback", data: null });
    }
  }
}

export async function POST(request: Request) {
  const userKey = resolveUserKey(request);
  const dataPath = buildFallbackDataPath(userKey);
  const payload = await readRequestJson<unknown>(request);
  if (payload === null) {
    return NextResponse.json({ ok: true, source: "fallback" });
  }
  try {
    const result = await runPythonBridge("save", "scores", payload, userKey);
    return NextResponse.json(result);
  } catch {
    await fs.mkdir(fallbackDataDirectory, { recursive: true });
    await fs.writeFile(
      dataPath,
      JSON.stringify(
        {
          ok: true,
          source: "fallback",
          savedAt: new Date().toISOString(),
          data: payload
        },
        null,
        2
      ),
      "utf8"
    );

    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
