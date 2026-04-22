import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { runPythonBridge } from "@/lib/python-bridge";

export const runtime = "nodejs";

const fallbackDataDirectory = path.join(process.cwd(), ".data");
const fallbackDataFilePath = path.join(fallbackDataDirectory, "onboarding-scores.json");
export async function GET() {
  try {
    const result = await runPythonBridge("get", "scores");
    return NextResponse.json(result);
  } catch {
    try {
      const raw = await fs.readFile(fallbackDataFilePath, "utf8");
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({ ok: true, source: "fallback", data: null });
    }
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  try {
    const result = await runPythonBridge("save", "scores", payload);
    return NextResponse.json(result);
  } catch {
    await fs.mkdir(fallbackDataDirectory, { recursive: true });
    await fs.writeFile(
      fallbackDataFilePath,
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
