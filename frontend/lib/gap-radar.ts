import { normalizeUniversityName } from "@/lib/admission-data";

const UNIVERSITY_BASE: Record<string, number> = {
  서울대: 24,
  연세대: 28,
  고려대: 32,
  서강대: 38,
  성균관대: 74,
  한양대: 61,
  중앙대: 66,
  경희대학교: 64,
  경희대: 64,
  이화여대: 68,
  한국외대: 63,
  시립대: 62,
  건국대: 71,
  동국대: 69,
  숙명여대: 67,
  홍익대: 76,
  숭실대: 72,
  국민대: 75,
  광운대: 78,
  인하대: 73,
  아주대: 72,
  부산대: 70,
  경북대: 71,
  전남대: 74,
  충남대: 73,
  충북대: 75,
  강원대: 79,
  전북대: 77,
  경상국립대: 78
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseAvg(value: string): number | null {
  const t = value.trim();
  if (!t || t === "-") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export type RadarAxisModel = {
  key: string;
  label: string;
  shortLabel: string;
  current: number;
  target: number;
  barColor: string;
};

export type GapRadarSummaryCard = {
  key: string;
  label: string;
  value: string;
  sub: string;
  valueClass: string;
};

export type AdmissionRadarModel = {
  summaryCards: GapRadarSummaryCard[];
  axes: RadarAxisModel[];
};

function tier(university: string) {
  const u = normalizeUniversityName(university);
  return UNIVERSITY_BASE[u] ?? 68;
}

/** 목표 학교·학과·성적 기준 합격 가능성 체크용 수치 (학교마다 합격권 평균·현재 값이 달라짐) */
export function buildAdmissionRadarModel(
  university: string,
  major: string,
  schoolAverageDisplay: string,
  mockAverageDisplay: string
): AdmissionRadarModel {
  const uni = university.trim() || "목표대학";
  const maj = major.trim() || "희망학과";
  const seed = hashSeed(`${uni}|${maj}`);
  const t = tier(uni);
  /** 난이도 높을수록(숫자 작을수록) 합격권 평균 막대가 높게 */
  const difficulty = (100 - t) / 100;
  const baseTarget = Math.round(72 + difficulty * 16 + (seed % 5));

  const school = parseAvg(schoolAverageDisplay);
  const mock = parseAvg(mockAverageDisplay);
  const defaultSchool = 3.0;
  const defaultMock = 3.0;
  const g = school ?? defaultSchool;
  const m = mock ?? defaultMock;

  const gpaCurrent = clamp(Math.round(94 - (g - 1.35) * 22 + ((seed >> 3) % 9) - 4), 28, 94);
  const majorBoost = /경영|경제|금융|회계/.test(maj) ? 6 : /공학|컴퓨터|소프트웨어/.test(maj) ? 4 : 0;
  const majorCurrent = clamp(Math.round(70 + majorBoost - (g - 2) * 8 + ((seed >> 7) % 11)), 30, 92);
  const csatCurrent = clamp(Math.round(88 - (m - 1.5) * 18 + ((seed >> 11) % 10) - 6), 22, 92);
  const compCurrent = clamp(Math.round((gpaCurrent + majorCurrent + csatCurrent) / 3 + ((seed >> 13) % 7) - 3), 28, 92);
  const recordCurrent = clamp(Math.round(78 - (g - 2) * 10 + ((seed >> 17) % 12)), 32, 90);
  const extraCurrent = clamp(Math.round(74 - (m - 2) * 9 + ((seed >> 19) % 14)), 30, 90);

  const spread = (n: number) => clamp(baseTarget + n + (seed % 5) - 2, 62, 94);

  const axes: RadarAxisModel[] = [
    {
      key: "gpa",
      label: "내신적합도",
      shortLabel: "내신",
      current: gpaCurrent,
      target: spread(10),
      barColor: "#1a4ea3"
    },
    {
      key: "major",
      label: "전공적합도",
      shortLabel: "전공",
      current: majorCurrent,
      target: spread(6),
      barColor: "#1f7a3d"
    },
    {
      key: "csat",
      label: "수능최저",
      shortLabel: "수능최저",
      current: csatCurrent,
      target: spread(4),
      barColor: "#b32d2d"
    },
    {
      key: "total",
      label: "종합점수",
      shortLabel: "종합",
      current: compCurrent,
      target: spread(5),
      barColor: "#9a610e"
    },
    {
      key: "record",
      label: "생기부",
      shortLabel: "생기부",
      current: recordCurrent,
      target: spread(8),
      barColor: "#6a3ea8"
    },
    {
      key: "extra",
      label: "비교과",
      shortLabel: "비교과",
      current: extraCurrent,
      target: spread(3),
      barColor: "#0f6f8b"
    }
  ];

  const gpaGap = clamp((axes[0].target - axes[0].current) / 20, 0, 2.5);
  const gpaSub = school == null ? "성적 미입력" : `갭 ${gpaGap.toFixed(1)}`;
  const majorSub = majorCurrent >= axes[1].target - 5 ? "양호" : "보완 권장";
  const csatSub = csatCurrent < axes[2].target - 12 ? "영어 필요" : "충족 여지";

  const summaryCards: GapRadarSummaryCard[] = [
    {
      key: "gpa",
      label: "내신적합도",
      value: `${axes[0].current}%`,
      sub: gpaSub,
      valueClass: "text-[#1a4ea3]"
    },
    {
      key: "major",
      label: "전공적합도",
      value: `${axes[1].current}%`,
      sub: majorSub,
      valueClass: "text-[#1f7a3d]"
    },
    {
      key: "csat",
      label: "수능최저충족",
      value: `${axes[2].current}%`,
      sub: csatSub,
      valueClass: "text-[#b32d2d]"
    }
  ];

  return {
    summaryCards,
    axes
  };
}
