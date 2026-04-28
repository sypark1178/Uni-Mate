import fs from "fs";

const p = new URL("../lib/member-store.ts", import.meta.url);
let s = fs.readFileSync(p, "utf8");
s = s.replace(/\r\n/g, "\n");

const anchor = 'serverError = payload.error || "등록된 회원을 찾지 못했습니다.";\n    }\n';
const a = s.indexOf(anchor);
if (a === -1) {
  console.error("anchor not found");
  process.exit(1);
}
const start = a + anchor.length;
const end = s.indexOf("\n  } catch {", start);
if (end === -1) {
  console.error("catch not found");
  process.exit(1);
}

const injected = `    if (payload) {
      const serverLikelyDown = !response.ok && response.status >= 500;
      if (!serverLikelyDown && serverError !== "등록된 회원을 찾지 못했습니다.") {
        return { ok: false as const, error: serverError };
      }
      if (serverLikelyDown && !serverError.trim()) {
        serverError = "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
      }
    }`;

s = s.slice(0, start) + "\n" + injected + s.slice(end);
fs.writeFileSync(p, s);
console.log("fixed member-store.ts");
