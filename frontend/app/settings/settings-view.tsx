"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";
import { compactGoalLine, goalRankNumberToneClass } from "@/lib/goal-display";
import { buildGoalAnalyses, goalStorageKey, parseSeededGoals } from "@/lib/planning";
import { profileStorageKey, useStudentProfile } from "@/lib/profile-storage";
import { scoreStorageKey, useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import { getCurrentMember, logoutMember } from "@/lib/member-store";
import { clearAllDrafts, isDraftDirty } from "@/lib/draft-store";

function shortenSchoolName(name: string) {
  return name.replace(/등학교$/, "");
}

const editButtonClass =
  "inline-flex h-[41px] min-w-[74px] items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-muted";
const wideEditButtonClass = `${editButtonClass} w-full`;

const AVATAR_INPUT_ID = "settings-avatar-file";

export function SettingsView() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams]);
  const { goals, hydrated: goalsHydrated, flushGoalsToServer } = useGoals(seededGoals);
  const { summary, hydrated: scoresHydrated, flushStoreToServer } = useScoreRecords();
  const { studentProfile, hydrated: profileHydrated, updateProfileImageAndSync, flushProfileToServer } = useStudentProfile();
  const goalAnalyses = buildGoalAnalyses(goals);
  const [toggles, setToggles] = useState({
    guideline: true,
    dday: true,
    reminder: true,
    privacy: true
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const cleanedSearchParams = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("returnTo");
    return nextParams;
  }, [searchParams]);

  const moveTo = (href: string) => mergeHrefWithSearchParams(href, cleanedSearchParams);

  const settingsReturnHref = moveTo("/settings");
  const basicEditHref = moveTo(`/onboarding/basic?returnTo=${encodeURIComponent(settingsReturnHref)}`);
  const gradesHref = moveTo("/onboarding/grades");
  const privacyHref = moveTo("/settings/privacy");
  const goalsFullHref = moveTo("/onboarding/goals");

  const chips = useMemo(
    () => [studentProfile.gradeLabel, `${String(studentProfile.targetYear).slice(2)}학년도 입시`],
    [studentProfile.gradeLabel, studentProfile.targetYear]
  );
  const isHydrated = goalsHydrated && scoresHydrated && profileHydrated;

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        void updateProfileImageAndSync(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const completeLogout = () => {
    setShowLogoutModal(false);
    logoutMember();
    window.location.replace(`${window.location.origin}/login`);
  };

  const discardLocalChanges = () => {
    const userKey = getCurrentMember()?.userId?.trim();
    if (userKey && typeof window !== "undefined") {
      window.localStorage.removeItem(`${profileStorageKey}:${userKey}`);
      window.localStorage.removeItem(`${scoreStorageKey}:${userKey}`);
      window.localStorage.removeItem(`${goalStorageKey}:${userKey}`);
    }
    clearAllDrafts();
  };

  const handleLogoutWithoutSave = () => {
    discardLocalChanges();
    completeLogout();
  };

  const handleSaveAndLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await flushProfileToServer();
      await flushStoreToServer();
      await flushGoalsToServer();
      clearAllDrafts();
      completeLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <PhoneFrame title="설정">
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-safe px-3 py-1 text-xs leading-none text-black">
              {chip}
            </span>
          ))}
        </div>

        <section className="mb-5">
          <h2 className="app-section-title mb-3">기본정보</h2>
          <div className="rounded-[22px] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-visible">
                  <div className="relative h-[59px] w-[59px]">
                    <input
                      id={AVATAR_INPUT_ID}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                    />
                    <label
                      htmlFor={AVATAR_INPUT_ID}
                      className="relative flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-[#0169C333] text-2xl font-semibold text-navy"
                    >
                      <span className="absolute inset-0 overflow-hidden rounded-full">
                        {studentProfile.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={studentProfile.profileImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            {studentProfile.name.slice(0, 1) || "?"}
                          </span>
                        )}
                      </span>
                      <span
                        className="pointer-events-none absolute bottom-0 right-0 z-10 flex h-[22px] w-[22px] translate-x-0.5 translate-y-0.5 items-center justify-center rounded-full border border-line bg-white shadow-md ring-2 ring-white"
                        aria-hidden
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 7h3l1.2-2h7.6L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                          <circle cx="12" cy="13" r="3.2" />
                        </svg>
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-medium">{isHydrated ? studentProfile.name : "불러오는 중..."}</div>
                  <div className="mt-1 text-sm text-muted">
                    {isHydrated
                      ? `${studentProfile.region || "제주특별자치도"} / ${studentProfile.district || "서귀포시"} / ${shortenSchoolName(studentProfile.schoolName || "서귀포시고등학교")}`
                      : "기본정보를 불러오는 중입니다."}
                  </div>
                </div>
              </div>
              <Link href={basicEditHref} prefetch className={editButtonClass}>
                수정
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="app-section-title mb-3">성적정보</h2>
          <div className="overflow-hidden rounded-[22px] border border-line bg-white">
            <div className="grid grid-cols-[1fr_1fr_auto] items-stretch max-sm:grid-cols-1">
              <div className="p-5">
                <div className="text-[18px] font-medium">내신</div>
                <div className="mt-2 text-xl font-medium text-accent">
                  {summary.settingsSchoolFromDb ?? summary.schoolAverage}
                </div>
              </div>
              <div className="border-l border-slate-100 p-5 max-sm:border-l-0 max-sm:border-t">
                <div className="text-[18px] font-medium">모의고사</div>
                <div className="mt-2 text-xl font-medium text-accent">
                  {summary.settingsMockFromDb ?? summary.mockAverage}
                </div>
                <div className="mt-2 text-xs text-muted">
                  생기부 {summary.studentRecordCount}건 / 업로드 {summary.uploadCount}건
                </div>
              </div>
              <div className="flex items-center justify-center border-l border-slate-100 p-4 max-sm:border-l-0 max-sm:border-t">
                <Link href={gradesHref} prefetch className={editButtonClass}>
                  수정
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="app-section-title mb-3">목표정보</h2>
          <div className="space-y-3">
            {goalAnalyses.length > 0 ? (
              goalAnalyses.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[22px] border border-line bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${goalRankNumberToneClass(index)}`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{compactGoalLine(item.university, item.major)}</div>
                      <div className="mt-1 text-sm text-muted">
                        {item.category} {item.fitScore}% 기준 목표 대학 분석 카드
                      </div>
                    </div>
                  </div>
                  <Link
                    href={moveTo(`/onboarding/goals?focus=${index + 1}`)}
                    prefetch
                    className={editButtonClass}
                  >
                    수정
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-line bg-white p-4 text-sm text-muted">
                저장된 목표대학/학과가 없습니다. 목표설정에서 먼저 선택해 주세요.
              </div>
            )}
            <Link href={goalsFullHref} prefetch className={`${wideEditButtonClass} text-center`}>
              + 목표대학 추가 / 전체 수정
            </Link>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="app-section-title mb-3">알림</h2>
          <div className="space-y-3">
            {[
              { key: "guideline" as const, title: "입시 정보 변경 알림", sub: "관심 대학 모집요강 변경 내용" },
              { key: "dday" as const, title: "입시 일정 D-day 알림", sub: "원서 접수와 수능 등 주요 일정" },
              { key: "reminder" as const, title: "주간 실행 리마인더", sub: "매주 체크리스트 완료 여부 알림" }
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-line bg-white p-4"
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
          <h2 className="app-section-title mb-3">데이터와 권한</h2>
          <div className="rounded-[22px] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">공개 정보 설정</div>
                <div className="mt-1 text-sm text-muted">기본정보, 성적, 목표정보의 공개 범위를 조정해요.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={privacyHref} prefetch className={editButtonClass}>
                  상세
                </Link>
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
          <h2 className="app-section-title mb-3">계정 관리</h2>
          <div className="space-y-4 rounded-[22px] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">로그아웃</div>
                <div className="mt-1 text-sm text-muted">이 기기에서 로그인을 종료합니다.</div>
              </div>
              <button
                type="button"
                className={editButtonClass}
                onClick={() => {
                  setShowWithdrawModal(false);
                  setShowLogoutModal(true);
                }}
              >
                로그아웃
              </button>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">회원 탈퇴</div>
                  <div className="mt-1 text-sm text-muted">30일 뒤 복구 불가, 이후 영구 삭제</div>
                </div>
                <button
                  type="button"
                  className={editButtonClass}
                  onClick={() => {
                    setShowLogoutModal(false);
                    setShowWithdrawModal(true);
                  }}
                >
                  탈퇴
                </button>
              </div>
            </div>
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />

      {showLogoutModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-5">
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-5">
            {isDraftDirty() ? (
              <>
                <h3 className="text-center text-2xl font-bold">변경사항을 저장할까요?</h3>
                <p className="mt-3 text-center text-sm leading-6 text-muted">
                  온보딩 정보 또는 실행정보에 저장되지 않은 변경사항이 있습니다. 로그아웃 전에 백엔드로 저장할 수 있어요.
                </p>
                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-navy text-sm font-semibold text-white disabled:opacity-60"
                    disabled={isLoggingOut}
                    onClick={() => void handleSaveAndLogout()}
                  >
                    {isLoggingOut ? "저장 중..." : "저장하고 나가기"}
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-xl border border-line text-sm font-semibold"
                    disabled={isLoggingOut}
                    onClick={handleLogoutWithoutSave}
                  >
                    그냥 나가기
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-xl text-sm font-semibold text-muted disabled:opacity-60"
                    disabled={isLoggingOut}
                    onClick={() => setShowLogoutModal(false)}
                  >
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-center text-2xl font-bold">로그아웃하시겠어요?</h3>
                <p className="mt-3 text-center text-sm leading-6 text-muted">로그아웃하면 다시 로그인해야 서비스를 이용할 수 있어요.</p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    className="h-11 flex-1 rounded-xl border border-line text-sm font-semibold"
                    onClick={() => setShowLogoutModal(false)}
                  >
                    아니오
                  </button>
                  <button
                    type="button"
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-navy text-sm font-semibold text-white"
                    onClick={completeLogout}
                  >
                    예
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {showWithdrawModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-5">
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-5">
            <h3 className="text-center text-2xl font-bold">정말 탈퇴하시겠어요?</h3>
            <p className="mt-3 text-center text-sm leading-6 text-muted">
              탈퇴를 진행하면 30일 이후 계정과 데이터가 영구 삭제됩니다. 계속 진행하시려면 탈퇴를 눌러 주세요.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" className="h-11 flex-1 rounded-xl border border-line" onClick={() => setShowWithdrawModal(false)}>
                취소
              </button>
              <button
                type="button"
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
