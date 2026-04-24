/** 화면 표시용: 학교명은 ~대까지만, 학과명은 학부·학과 접미어 없이 짧게 */

const MAJOR_COMPACT_MAP: Record<string, string> = {
  국어국문학: "국문",
  국어국문: "국문"
};

export function compactUniversityLabel(university: string): string {
  const t = university.trim();
  if (!t) return t;
  if (t.endsWith("여자대학교")) return t.replace(/여자대학교$/, "여대");
  if (t.endsWith("대학교")) return t.replace(/대학교$/, "대");
  if (t.endsWith("대학")) return t.replace(/대학$/, "대");
  return t.replace(/학교$/u, "");
}

export function compactMajorLabel(major: string): string {
  let s = major.trim();
  if (!s) return s;
  s = s.replace(/(학부|학과)$/u, "");
  while (s.endsWith("학") && s.length > 2) {
    s = s.slice(0, -1);
  }
  return MAJOR_COMPACT_MAP[s] ?? s;
}

export function compactGoalLine(university: string, major: string): string {
  const u = compactUniversityLabel(university);
  const m = compactMajorLabel(major);
  return m ? `${u} ${m}` : u;
}

/** 목표 1~3순위 원형 번호 배경. 1순위는 tailwind `goalRank1`(기준 핑크 #F5D3D1) */
export function goalRankNumberToneClass(rankIndex: number): string {
  if (rankIndex === 0) return "bg-goalRank1 text-black";
  if (rankIndex === 1) return "bg-goalRank2 text-black";
  if (rankIndex === 2) return "bg-safe text-black";
  return "bg-mist text-black";
}
