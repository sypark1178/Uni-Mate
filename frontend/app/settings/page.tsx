"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { buildGoalAnalyses, parseSeededGoals } from "@/lib/planning";
import { useStudentProfile } from "@/lib/profile-storage";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";

function getGoalBadgeTone(score: number) {
  if (score >= 72) return "bg-safe";
  if (score >= 55) return "bg-normal";
  return "bg-danger";
}

const editButtonClass =
  "inline-flex h-[41px] min-w-[74px] items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-muted";
const wideEditButtonClass = `${editButtonClass} w-full`;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const { summary } = useScoreRecords();
  const { studentProfile } = useStudentProfile();
  const goalAnalyses = buildGoalAnalyses(goals);
  const [toggles, setToggles] = useState({
    guideline: true,
    dday: true,
    reminder: true,
    privacy: true
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const cleanedSearchParams = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("returnTo");
    return nextParams;
  }, [searchParams]);

  const moveTo = (href: string) => mergeHrefWithSearchParams(href, cleanedSearchParams);
  const settingsReturnHref = moveTo("/settings");
  const chips = useMemo(() => [studentProfile.gradeLabel, `${String(studentProfile.targetYear).slice(2)}학년도 입시`], [studentProfile.gradeLabel, studentProfile.targetYear]);

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const move = (href: string) => {
    safeNavigate(router, moveTo(href));
  };

  const moveWithReturn = (href: string) => {
    safeNavigate(router, moveTo(`${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(settingsReturnHref)}`));
  };

  return (
    <>
      <PhoneFrame title="설정" subtitle="기본정보, 성적, 목표 대학과 알림 설정을 한곳에서 관리할 수 있어요.">
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-[#128F171F] px-3 py-1 text-xs">
              {chip}
            </span>
          ))}
        </div>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-semibold">기본정보</h2>
          <div className="rounded-[22px] border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-[59px] w-[59px] items-center justify-center rounded-full bg-[#0169C333] text-2xl font-semibold text-navy">
                  {studentProfile.name.slice(0, 1) || "?"}
                </div>
                <div>
                  <div className="text-xl font-medium">{studentProfile.name}</div>
                  <div className="mt-1 text-sm text-muted">
                    {studentProfile.region || "서울"} / {studentProfile.district || "강남구"} / {studentProfile.schoolName || "대치고등학교"}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => moveWithReturn("/onboarding/basic")} className={editButtonClass}>
                수정
              </button>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-semibold">성적정보</h2>
          <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-soft">
            <div className="grid grid-cols-[1fr_1fr_auto] items-stretch max-sm:grid-cols-1">
              <div className="p-5">
                <div className="text-xl font-medium">내신</div>
                <div className="mt-2 text-xl font-medium text-accent">{summary.schoolAverage}</div>
              </div>
              <div className="border-l border-slate-100 p-5 max-sm:border-l-0 max-sm:border-t">
                <div className="text-xl font-medium">모의고사</div>
                <div className="mt-2 text-xl font-medium text-accent">{summary.mockAverage}</div>
                <div className="mt-2 text-xs text-muted">
                  생기부 {summary.studentRecordCount}건 / 업로드 {summary.uploadCount}건
                </div>
              </div>
              <div className="flex items-center justify-center border-l border-slate-100 p-4 max-sm:border-l-0 max-sm:border-t">
                <button type="button" onClick={() => move("/onboarding/grades")} className={editButtonClass}>
                  수정
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-semibold">목표정보</h2>
          <div className="space-y-3">
            {goalAnalyses.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-line bg-white p-4 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${getGoalBadgeTone(item.fitScore)}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {item.university} - {item.major}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {item.category} {item.fitScore}% 기준 목표 대학 분석 카드
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => move(`/onboarding/goals?focus=${index + 1}`)} className={editButtonClass}>
                  수정
                </button>
              </div>
            ))}
            <button type="button" onClick={() => move("/onboarding/goals")} className={`${wideEditButtonClass} shadow-soft`}>
              + 목표대학 추가 / 전체 수정
            </button>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-semibold">알림</h2>
          <div className="space-y-3">
            {[
              { key: "guideline" as const, title: "입시 정보 변경 알림", sub: "관심 대학 모집요강 변경 내용" },
              { key: "dday" as const, title: "입시 일정 D-day 알림", sub: "원서 접수와 수능 등 주요 일정" },
              { key: "reminder" as const, title: "주간 실행 리마인더", sub: "매주 체크리스트 완료 여부 알림" }
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-line bg-white p-4 shadow-soft"
              >
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-muted">{item.sub}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles[item.key]}
                  onClick={() => toggle(item.key)}
                  className={`relative h-[30px] w-16 rounded-full transition ${toggles[item.key] ? "bg-navy" : "bg-slate-300"}`}
                >
                  <span
                    className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition ${
                      toggles[item.key] ? "left-[37px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-semibold">데이터와 권한</h2>
          <div className="rounded-[22px] border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">공개 정보 설정</div>
                <div className="mt-1 text-sm text-muted">기본정보, 성적, 목표정보의 공개 범위를 조정해요.</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => move("/settings/privacy")} className={editButtonClass}>
                  상세
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles.privacy}
                  onClick={() => toggle("privacy")}
                  className={`relative h-[30px] w-16 rounded-full transition ${toggles.privacy ? "bg-navy" : "bg-slate-300"}`}
                >
                  <span
                    className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition ${
                      toggles.privacy ? "left-[37px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">계정 관리</h2>
          <div className="rounded-[22px] border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">회원 탈퇴</div>
                <div className="mt-1 text-sm text-muted">30일 뒤 복구 불가, 이후 영구 삭제</div>
              </div>
              <button className={editButtonClass} onClick={() => setShowWithdrawModal(true)}>
                탈퇴
              </button>
            </div>
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />

      {showWithdrawModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5">
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-5 shadow-soft">
            <h3 className="text-center text-2xl font-bold">정말 탈퇴하시겠어요?</h3>
            <p className="mt-3 text-center text-sm leading-6 text-muted">
              탈퇴를 진행하면 30일 이후 계정과 데이터가 영구 삭제됩니다. 계속 진행하시려면 탈퇴를 눌러 주세요.
            </p>
            <div className="mt-5 flex gap-3">
              <button className="h-11 flex-1 rounded-xl border border-line" onClick={() => setShowWithdrawModal(false)}>
                취소
              </button>
              <button
                className="h-11 flex-1 rounded-xl border border-[#efc7c7] bg-[#fff5f5] text-[#b42318]"
                onClick={() => setShowWithdrawModal(false)}
              >
                탈퇴
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
