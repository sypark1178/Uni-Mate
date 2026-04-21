import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const fallbackDataDirectory = path.join(process.cwd(), ".data");
const fallbackDataFilePath = path.join(fallbackDataDirectory, "onboarding-scores.json");
const workspaceRoot = path.resolve(process.cwd(), "..");
const pythonCliPath = path.join(workspaceRoot, "backend", "app", "cli", "onboarding_scores_cli.py");
const pythonCommand = process.env.PYTHON_BIN || "python";
const pythonPath = process.env.PYTHONPATH
  ? `${workspaceRoot}${path.delimiter}${process.env.PYTHONPATH}`
  : workspaceRoot;

function runPythonScoreCli(command: "get" | "save", payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [pythonCliPath, command], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        PYTHONPATH: pythonPath
      }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `python cli exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });

    if (command === "save") {
      child.stdin.write(JSON.stringify(payload ?? {}));
    }
    child.stdin.end();
  });
}

export async function GET() {
  try {
    const result = await runPythonScoreCli("get");
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
    const result = await runPythonScoreCli("save", payload);
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
