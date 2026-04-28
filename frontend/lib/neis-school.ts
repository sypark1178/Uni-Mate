import { readJsonResponse } from "@/lib/read-json-response";

type NeisSchoolRow = {
  LCTN_SC_NM?: string;
  SCHUL_NM?: string;
};

const neisRegionCodeMap: Record<string, string> = {
  서울특별시: "B10",
  부산광역시: "C10",
  대구광역시: "D10",
  인천광역시: "E10",
  광주광역시: "F10",
  대전광역시: "G10",
  울산광역시: "H10",
  세종특별자치시: "I10",
  경기도: "J10",
  강원특별자치도: "K10",
  충청북도: "M10",
  충청남도: "N10",
  전라북도: "P10",
  전라남도: "Q10",
  경상북도: "R10",
  경상남도: "S10",
  제주특별자치도: "T10"
};

function normalizeRegion(region: string) {
  const trimmed = region.trim();
  if (trimmed === "서울") return "서울특별시";
  if (trimmed === "부산") return "부산광역시";
  if (trimmed === "대구") return "대구광역시";
  if (trimmed === "인천") return "인천광역시";
  if (trimmed === "광주") return "광주광역시";
  if (trimmed === "대전") return "대전광역시";
  if (trimmed === "울산") return "울산광역시";
  if (trimmed === "세종") return "세종특별자치시";
  if (trimmed === "경기") return "경기도";
  if (trimmed === "강원") return "강원특별자치도";
  if (trimmed === "충북") return "충청북도";
  if (trimmed === "충남") return "충청남도";
  if (trimmed === "전북") return "전라북도";
  if (trimmed === "전남") return "전라남도";
  if (trimmed === "경북") return "경상북도";
  if (trimmed === "경남") return "경상남도";
  if (trimmed === "제주") return "제주특별자치도";
  return trimmed;
}

function schoolKindByGradeLabel(gradeLabel: string): "초등학교" | "중학교" | "고등학교" | "" {
  if (gradeLabel.includes("초등")) return "초등학교";
  if (gradeLabel.includes("중")) return "중학교";
  if (gradeLabel.includes("고")) return "고등학교";
  return "";
}

function sortKorean(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right, "ko-KR"));
}

async function fetchSchoolRowsPage(args: {
  apiKey: string;
  officeCode: string;
  page: number;
  district?: string;
  schoolKind?: string;
}): Promise<{ rows: NeisSchoolRow[]; totalCount: number }> {
  const url = new URL("https://open.neis.go.kr/hub/schoolInfo");
  url.searchParams.set("KEY", args.apiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", String(args.page));
  url.searchParams.set("pSize", "1000");
  url.searchParams.set("ATPT_OFCDC_SC_CODE", args.officeCode);
  if (args.district?.trim()) url.searchParams.set("LCTN_SC_NM", args.district.trim());
  if (args.schoolKind?.trim()) url.searchParams.set("SCHUL_KND_SC_NM", args.schoolKind.trim());

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`NEIS request failed: ${response.status}`);
  }
  const payload = await readJsonResponse<{
    schoolInfo?: Array<{ head?: Array<{ list_total_count?: number }>; row?: NeisSchoolRow[] }>;
    RESULT?: { CODE?: string; MESSAGE?: string };
  }>(response);

  if (!payload) {
    return { rows: [], totalCount: 0 };
  }

  if (payload.RESULT?.CODE && payload.RESULT.CODE !== "INFO-000") {
    throw new Error(payload.RESULT.MESSAGE || payload.RESULT.CODE);
  }

  const head = payload.schoolInfo?.[0]?.head?.[0];
  const totalCount = Number(head?.list_total_count ?? 0);
  const rows = payload.schoolInfo?.[1]?.row ?? [];
  return { rows, totalCount: Number.isFinite(totalCount) ? totalCount : 0 };
}

export async function fetchNeisSchools(args: {
  region: string;
  district?: string;
  gradeLabel?: string;
}) {
  const normalizedRegion = normalizeRegion(args.region);
  const officeCode = neisRegionCodeMap[normalizedRegion];
  if (!officeCode) {
    throw new Error("지원하지 않는 지역입니다.");
  }

  const apiKey = process.env.NEIS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NEIS_API_KEY가 설정되지 않았습니다.");
  }

  const schoolKind = schoolKindByGradeLabel(args.gradeLabel ?? "");
  const first = await fetchSchoolRowsPage({
    apiKey,
    officeCode,
    page: 1,
    district: args.district,
    schoolKind
  });

  const allRows: NeisSchoolRow[] = [...first.rows];
  const totalPages = Math.max(1, Math.ceil(first.totalCount / 1000));
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchSchoolRowsPage({
      apiKey,
      officeCode,
      page,
      district: args.district,
      schoolKind
    });
    allRows.push(...next.rows);
  }

  const districtSet = new Set<string>();
  const schoolSet = new Set<string>();
  allRows.forEach((row) => {
    const district = String(row.LCTN_SC_NM ?? "").trim();
    const school = String(row.SCHUL_NM ?? "").trim();
    if (district) districtSet.add(district);
    if (school) schoolSet.add(school);
  });

  return {
    region: normalizedRegion,
    districts: sortKorean(Array.from(districtSet)),
    schools: sortKorean(Array.from(schoolSet))
  };
}

