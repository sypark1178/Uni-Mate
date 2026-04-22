import { spawn } from "child_process";
import path from "path";

const workspaceRoot = path.resolve(process.cwd(), "..");
const pythonCliPath = path.join(workspaceRoot, "backend", "app", "cli", "onboarding_scores_cli.py");
const pythonCommand = process.env.PYTHON_BIN || "python";
const pythonPath = process.env.PYTHONPATH ? `${workspaceRoot}${path.delimiter}${process.env.PYTHONPATH}` : workspaceRoot;

type BridgeEntity = "scores" | "profile" | "goals" | "analysis";

export function runPythonBridge(command: "get" | "save", entity: BridgeEntity, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [pythonCliPath, command, "--entity", entity], {
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
