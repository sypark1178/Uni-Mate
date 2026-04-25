import { spawn } from "child_process";
import path from "path";

const workspaceRoot = path.resolve(process.cwd(), "..");
const pythonCliPath = path.join(workspaceRoot, "backend", "app", "cli", "onboarding_scores_cli.py");
const pythonCommand = process.env.PYTHON_BIN || "python";
const pythonPath = process.env.PYTHONPATH ? `${workspaceRoot}${path.delimiter}${process.env.PYTHONPATH}` : workspaceRoot;
const pythonEnv = {
  ...process.env,
  PYTHONIOENCODING: "utf-8",
  PYTHONUTF8: "1",
  PYTHONPATH: pythonPath
};

type BridgeEntity = "scores" | "profile" | "goals" | "analysis" | "guest_temp";

export function runPythonBridge(
  command: "get" | "save",
  entity: BridgeEntity,
  payload?: unknown,
  userKey?: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [pythonCliPath, command, "--entity", entity];
    const normalizedUserKey = String(userKey ?? "").trim();
    if (normalizedUserKey) {
      args.push("--user-key", normalizedUserKey);
    }
    const child = spawn(pythonCommand, args, {
      cwd: workspaceRoot,
      env: pythonEnv
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

    if (command === "save" || (command === "get" && payload !== undefined)) {
      child.stdin.write(JSON.stringify(payload ?? {}));
    }
    child.stdin.end();
  });
}

export function runPythonLogin(payload: { loginId: string; password: string }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [pythonCliPath, "login"];
    if (process.env.UNI_MATE_DB_PATH?.trim()) {
      args.push("--db-path", process.env.UNI_MATE_DB_PATH.trim());
    }
    const child = spawn(pythonCommand, args, {
      cwd: workspaceRoot,
      env: pythonEnv
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

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
