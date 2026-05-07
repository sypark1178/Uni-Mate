import { logoutMember } from "@/lib/member-store";

/** 로컬·세션에서 `uni-mate*` 키를 제거하고 비로그인 상태로 맞춘다 */
export function clearUniMateBrowserState() {
  if (typeof window === "undefined") return;

  try {
    logoutMember();
  } catch {
    /* ignore */
  }

  try {
    const lsKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("uni-mate")) lsKeys.push(k);
    }
    lsKeys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }

  try {
    const ssKeys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("uni-mate")) ssKeys.push(k);
    }
    ssKeys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
