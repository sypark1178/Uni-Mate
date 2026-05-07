"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { registerMember, setCurrentMember } from "@/lib/member-store";
import { safeNavigate } from "@/lib/navigation";
import { profileStorageKey } from "@/lib/profile-storage";
import { scoreStorageKey } from "@/lib/score-storage";
import { onboardingFormFieldClass } from "@/lib/onboarding-buttons";
import { readJsonResponse } from "@/lib/read-json-response";
import { goalStorageKey } from "@/lib/planning";
import type { GoalChoice, ScoreMemoryStore, StudentProfile } from "@/lib/types";

type SignupFormProps = {
  title?: string;
  subtitle?: string;
};

export function SignupForm({
  title = "회원가입",
  subtitle = "분석 결과를 계속 보고 다시 이어볼 수 있도록 계정을 연결해 주세요."
}: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const guestSaveType = searchParams.get("guestSaveType")?.trim() ?? "";
  const guestSaveId = searchParams.get("guestSaveId")?.trim() ?? "";
  const [form, setForm] = useState({
    userId: "",
    password: "",
    name: "",
    school: "",
    grade: "",
    examYear: "",
    district: "",
    email: "",
    phone: ""
  });
  const [agreements, setAgreements] = useState({
    privacy: false,
    terms: false,
    marketing: false
  });
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => agreements.privacy && agreements.terms, [agreements]);
  const allChecked = agreements.privacy && agreements.terms && agreements.marketing;

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadProfileFromLocalStorage = (): StudentProfile | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`${profileStorageKey}:local-user`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      const candidate = parsed as Partial<StudentProfile>;
      const name = typeof candidate.name === "string" ? candidate.name : "";
      const gradeLabel = typeof candidate.gradeLabel === "string" ? candidate.gradeLabel : "";
      const schoolName = typeof candidate.schoolName === "string" ? candidate.schoolName : "";
      const district = typeof candidate.district === "string" ? candidate.district : "";
      const targetYear =
        typeof candidate.targetYear === "number" && Number.isFinite(candidate.targetYear) ? candidate.targetYear : 0;
      return {
        name,
        gradeLabel,
        schoolName,
        district,
        track: typeof candidate.track === "string" ? candidate.track : "미정",
        targetYear,
        hasRequiredInfo: false,
        hasScores: false
      };
    } catch {
      return null;
    }
  };

  const handleLoadMyInfo = () => {
    const profile = loadProfileFromLocalStorage();
    if (!profile) {
      setErrorMessage("저장된 기본 정보가 없습니다. 먼저 온보딩에서 기본 정보를 입력해 주세요.");
      return;
    }
    setErrorMessage("");
    setForm((prev) => ({
      ...prev,
      name: profile.name?.trim() ?? "",
      school: profile.schoolName?.trim() ?? "",
      grade: profile.gradeLabel?.trim() ?? "",
      examYear: profile.targetYear ? String(profile.targetYear) : "",
      district: profile.district?.trim() ?? "",
      email: prev.email || (guestSaveType === "email" ? guestSaveId : prev.email)
    }));
  };

  const handleToggleAll = (checked: boolean) => {
    setAgreements({
      privacy: checked,
      terms: checked,
      marketing: checked
    });
  };

  const handleBack = () => {
    safeNavigate(router, returnTo);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const result = registerMember({
      userId: form.userId,
      name: form.name,
      email: form.email,
      password: form.password
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setErrorMessage("");
    setCurrentMember(result.member);
    void persistAllToMemberDb(result.member.userId).finally(() => {
      safeNavigate(router, returnTo);
    });
  };

  const persistAllToMemberDb = async (userKey: string) => {
    if (typeof window === "undefined") return;

    const normalizeProfile = (raw: unknown): StudentProfile | null =>
      raw && typeof raw === "object" ? (raw as StudentProfile) : null;
    const normalizeScores = (raw: unknown): ScoreMemoryStore | null =>
      raw && typeof raw === "object" ? (raw as ScoreMemoryStore) : null;
    const normalizeGoals = (raw: unknown): GoalChoice[] | null =>
      Array.isArray(raw) ? (raw as GoalChoice[]) : null;

    let profile: StudentProfile | null = null;
    let scores: ScoreMemoryStore | null = null;
    let goals: GoalChoice[] | null = null;

    try {
      profile = normalizeProfile(JSON.parse(window.localStorage.getItem(`${profileStorageKey}:local-user`) ?? "null"));
      scores = normalizeScores(JSON.parse(window.localStorage.getItem(`${scoreStorageKey}:local-user`) ?? "null"));
      goals = normalizeGoals(JSON.parse(window.localStorage.getItem(goalStorageKey) ?? "null"));
    } catch {
      // ignore local parse issues and fallback to guest-temp query
    }

    if ((!profile || !scores || !goals) && guestSaveType && guestSaveId) {
      try {
        const response = await fetch(
          `/api/onboarding/guest-temp?contactType=${encodeURIComponent(guestSaveType)}&contactId=${encodeURIComponent(guestSaveId)}`,
          { method: "GET", cache: "no-store" }
        );
        const payload = await readJsonResponse<{
          ok?: boolean;
          data?: { snapshot?: { profile?: StudentProfile; scores?: ScoreMemoryStore; goals?: GoalChoice[] } };
        }>(response);
        const snapshot = payload?.data?.snapshot;
        profile = profile ?? snapshot?.profile ?? null;
        scores = scores ?? snapshot?.scores ?? null;
        goals = goals ?? snapshot?.goals ?? null;
      } catch {
        // no-op
      }
    }

    const headers = { "Content-Type": "application/json", "x-user-key": userKey };
    const tasks: Promise<Response>[] = [];
    if (profile) tasks.push(fetch("/api/onboarding/profile", { method: "POST", headers, body: JSON.stringify(profile) }));
    if (scores) tasks.push(fetch("/api/onboarding/scores", { method: "POST", headers, body: JSON.stringify(scores) }));
    if (goals && goals.length > 0) tasks.push(fetch("/api/onboarding/goals", { method: "POST", headers, body: JSON.stringify(goals.slice(0, 3)) }));
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  };

  return (
    <PhoneFrame title={title} subtitle={subtitle}>
      <div className="space-y-5">
        <section>
          <div className="mb-2 text-sm font-bold text-ink">아이디</div>
          <input
            className={onboardingFormFieldClass}
            placeholder="아이디를 입력해 주세요"
            value={form.userId}
            onChange={(event) => updateField("userId", event.target.value)}
          />
          <div className="mb-2 mt-4 text-sm font-bold text-ink">비밀번호</div>
          <input
            type="password"
            className={onboardingFormFieldClass}
            placeholder="비밀번호를 입력해 주세요"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
        </section>

        <section className="rounded-[18px] border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-ink">기본 정보</div>
            <button
              type="button"
              onClick={handleLoadMyInfo}
              className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
            >
              내 정보 불러오기
            </button>
          </div>
          <div className="space-y-3">
            <input
              className={onboardingFormFieldClass}
              placeholder="이름"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            <input
              className={onboardingFormFieldClass}
              placeholder="학교"
              value={form.school}
              onChange={(event) => updateField("school", event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className={onboardingFormFieldClass}
                placeholder="학년"
                value={form.grade}
                onChange={(event) => updateField("grade", event.target.value)}
              />
              <input
                className={onboardingFormFieldClass}
                placeholder="입시 연도"
                value={form.examYear}
                onChange={(event) => updateField("examYear", event.target.value)}
              />
            </div>
            <input
              className={onboardingFormFieldClass}
              placeholder="시/군/구"
              value={form.district}
              onChange={(event) => updateField("district", event.target.value)}
            />
            <input
              className={onboardingFormFieldClass}
              placeholder="이메일"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <input
              className={onboardingFormFieldClass}
              placeholder="전화번호"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>
        </section>

        <section className="rounded-[18px] border border-line bg-white p-4">
          <div className="mb-3 text-sm font-bold text-ink">개인정보 수집 및 이용 동의</div>
          <label className="mb-3 flex items-start gap-3 rounded-xl border border-line px-3 py-3">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(event) => handleToggleAll(event.target.checked)}
              className="mt-1 h-4 w-4 accent-navy"
            />
            <span className="text-sm font-semibold text-ink">전체 동의</span>
          </label>
          <div className="space-y-3 text-sm text-muted">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements.privacy}
                onChange={(event) => setAgreements((prev) => ({ ...prev, privacy: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-navy"
              />
              <span>개인정보 수집 및 이용 동의 (필수)</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={(event) => setAgreements((prev) => ({ ...prev, terms: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-navy"
              />
              <span>서비스 이용약관 동의 (필수)</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements.marketing}
                onChange={(event) => setAgreements((prev) => ({ ...prev, marketing: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-navy"
              />
              <span>마케팅 정보 수신 동의 (선택)</span>
            </label>
          </div>
        </section>

        {errorMessage ? <p className="text-sm font-semibold text-[#B42318]">{errorMessage}</p> : null}

        <div className="grid gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-navy px-4 py-4 text-base font-bold text-white disabled:bg-slate-300"
          >
            가입하기
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="mx-auto w-fit text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
          >
            뒤로가기
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
