"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

const entries: { href: string; label: string }[] = [
  { href: "/", label: "랜딩" },
  { href: "/login", label: "로그인" },
  { href: "/signup", label: "회원가입" },
  { href: "/onboarding/empty-start", label: "온보딩·저장초기화" },
  { href: "/onboarding/basic", label: "온보딩·기본정보" },
  { href: "/onboarding/grades", label: "온보딩·성적" },
  { href: "/onboarding/grades/upload", label: "온보딩·성적 업로드" },
  { href: "/onboarding/goals", label: "온보딩·목표" },
  { href: "/analysis/loading?source=goals", label: "분석·로딩" },
  { href: "/analysis", label: "분석" },
  { href: "/analysis/gap", label: "갭분석" },
  { href: "/analysis/simulation", label: "시뮬레이션" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/dashboard/save", label: "대시보드·저장" },
  { href: "/dashboard/empty", label: "대시보드·빈" },
  { href: "/strategy", label: "전략" },
  { href: "/strategy/subjects", label: "추천 수강과목" },
  { href: "/strategy/study-plan", label: "학습계획" },
  { href: "/execution", label: "실행" },
  { href: "/evidence", label: "근거" },
  { href: "/settings", label: "설정" },
  { href: "/settings/privacy", label: "설정·개인정보" },
  { href: "/qa", label: "QA" }
];

function withWireframeCapture(href: string) {
  return href.includes("?") ? `${href}&wf=1` : `${href}?wf=1`;
}

/**
 * 와이어프레임 캡처용: 창 크기에 맞게 축소해 스크롤 없이 한 화면에 전체 링크가 들어가게 함
 */
export default function FullMapPage() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const update = () => {
      const viewport = viewportRef.current;
      const natural = naturalRef.current;
      if (!viewport || !natural) {
        return;
      }
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const cw = natural.scrollWidth;
      const ch = natural.scrollHeight;
      if (cw < 1 || ch < 1) {
        return;
      }
      const next = Math.min(1, (vw * 0.98) / cw, (vh * 0.98) / ch);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    update();
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    if (viewportRef.current) {
      ro.observe(viewportRef.current);
    }
    window.addEventListener("resize", update);
    const t = window.setTimeout(update, 0);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className="box-border flex h-svh max-h-svh w-full flex-col overflow-hidden bg-mist p-2 text-ink">
      <div
        ref={viewportRef}
        className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-hidden"
      >
        {/* zoom 은 배치 크기까지 줄여 창에 스크롤이 생기지 않게 함(Chrome/Edge) */}
        <div style={{ zoom: scale }}>
          <div ref={naturalRef} className="w-max max-w-[min(100%,1100px)]">
          <header className="mb-1.5 border-b border-line/80 pb-1.5">
            <h1 className="text-xs font-semibold leading-tight">Uni-Mate 화면 링크 (새 탭 · 각 링크에 ?wf=1)</h1>
            <p className="mt-0.5 text-[9px] leading-tight text-muted">
              휴대폰 프레임 내부 스크롤 없음. 아래 전체가 창 안에 맞도록 자동 축소됩니다.
            </p>
          </header>
          <div className="grid grid-cols-11 gap-0.5 sm:grid-cols-12">
            {entries.map((item) => (
              <Link
                key={item.href}
                href={withWireframeCapture(item.href)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-line bg-white px-1 py-0.5 text-center text-[9px] font-medium leading-none text-navy hover:bg-white/90 sm:text-[10px]"
                title={withWireframeCapture(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
