"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";

type VisibilityScope = "public" | "partial" | "private";
type VisibilityState = {
  basic: VisibilityScope;
  goals: VisibilityScope;
  scores: VisibilityScope;
};

const storageKey = "uni-mate-privacy-scope";
const editButtonClass =
  "inline-flex h-[41px] items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-muted";

const visibilityOptions: Array<{ value: VisibilityScope; label: string; description: string }> = [
  { value: "public", label: "전체 공개", description: "추천 화면과 프로필에서 모두 공개합니다." },
  { value: "partial", label: "부분 공개", description: "핵심 요약만 보이고 세부 정보는 숨깁니다." },
  { value: "private", label: "비공개", description: "본인 화면에서만 확인할 수 있습니다." }
];

const defaultState: VisibilityState = {
  basic: "partial",
  goals: "public",
  scores: "private"
};

export default function SettingsPrivacyPage() {
  const searchParams = useSearchParams();
  const settingsHref = mergeHrefWithSearchParams("/settings", searchParams);
  const [visibility, setVisibility] = useState<VisibilityState>(defaultState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setVisibility({ ...defaultState, ...JSON.parse(raw) });
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const updateVisibility = (key: keyof VisibilityState, value: VisibilityScope) => {
    const nextValue = { ...visibility, [key]: value };
    setVisibility(nextValue);
    window.localStorage.setItem(storageKey, JSON.stringify(nextValue));
  };

  const sections: Array<{ key: keyof VisibilityState; title: string; desc: string }> = [
    {
      key: "basic",
      title: "기본정보 공개 범위",
      desc: "이름, 학교, 지역 같은 기본 프로필 정보를 어디까지 보여줄지 정합니다."
    },
    {
      key: "goals",
      title: "목표정보 공개 범위",
      desc: "목표 대학/학과와 목표 우선순위 카드의 노출 범위를 정합니다."
    },
    {
      key: "scores",
      title: "성적정보 공개 범위",
      desc: "내신, 모의고사, 생기부 요약 정보의 공개 범위를 정합니다."
    }
  ];

  return (
    <PhoneFrame title="정보 공개범위 설정" subtitle="온보딩에서 입력한 정보를 항목별로 선택해서 공개 범위를 조정할 수 있습니다.">
      <div className="space-y-4">
        {sections.map((item) => (
          <section key={item.key} className="rounded-[22px] border border-line bg-white p-4">
            <div className="font-semibold">{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
            <div className="mt-4 grid gap-2">
              {visibilityOptions.map((option) => {
                const isActive = visibility[item.key] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateVisibility(item.key, option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive ? "border-navy bg-navy/5" : "border-line bg-white"
                    }`}
                  >
                    <div className="text-sm font-semibold text-ink">{option.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">{option.description}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-muted">
              현재 설정: {visibilityOptions.find((option) => option.value === visibility[item.key])?.label}
            </div>
          </section>
        ))}
        <Link href={settingsHref} className={`${editButtonClass} w-full`}>
          이전으로 돌아가기
        </Link>
      </div>
    </PhoneFrame>
  );
}
