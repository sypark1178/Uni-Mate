/**
 * Webpack 청크 누락(Cannot find module './NNN.js') 등 .next 불일치 시
 * `npm run dev:clean`으로 캐시를 지운 뒤 다시 띄운다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nextDir = path.join(root, ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  process.stdout.write(`Removed ${nextDir}\n`);
} catch (err) {
  process.stderr.write(String(err?.message ?? err) + "\n");
  process.exitCode = 1;
}
