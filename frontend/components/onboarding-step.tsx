"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { onboardingPrimaryCtaClass } from "@/lib/onboarding-buttons";
import { safeNavigate } from "@/lib/navigation";

type OnboardingStepProps = {
  step: string;
  title: string;
  subtitle: string;
  subtitleClassName?: string;
  children: React.ReactNode;
  prevHref?: string;
  prevLabel?: string;
  nextHref: string;
  nextLabel: string;
  /** plainHref: 현재 URL 쿼리를 붙이지 않고 href 그대로 이동(예: /login) */
  helperLink?: { href: string; label: string; plainHref?: boolean };
  postPrevLink?: { href: string; label: string; plainHref?: boolean };
  onNext?: () => Promise<void> | void;
};

function mergeSearchParams(href: string, currentParams: URLSearchParams) {
  if (!href.startsWith("/")) {
    return href;
  }

  const [pathname, queryString] = href.split("?");
  const mergedParams = new URLSearchParams(queryString ?? "");

  currentParams.forEach((value, key) => {
    if (key === "returnTo") {
      return;
    }
    if (!mergedParams.has(key)) {
      mergedParams.set(key, value);
    }
  });

  const nextQuery = mergedParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function OnboardingStep({
  step,
  title,
  subtitle,
  subtitleClassName,
  children,
  prevHref,
  prevLabel = "뒤로가기",
  nextHref,
  nextLabel,
  helperLink,
  postPrevLink,
  onNext
}: OnboardingStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedPrevHref = prevHref ? mergeSearchParams(prevHref, searchParams) : undefined;
  const resolvedNextHref = mergeSearchParams(nextHref, searchParams);
  const resolvedHelperHref = helperLink
    ? helperLink.plainHref
      ? helperLink.href
      : mergeSearchParams(helperLink.href, searchParams)
    : undefined;
  const resolvedPostPrevHref = postPrevLink
    ? postPrevLink.plainHref
      ? postPrevLink.href
      : mergeSearchParams(postPrevLink.href, searchParams)
    : undefined;

  const handleBack = () => {
    if (resolvedPrevHref) {
      safeNavigate(router, resolvedPrevHref);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    }
  };

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    }
    safeNavigate(router, resolvedNextHref);
  };

  return (
    <PhoneFrame
      title={title}
      subtitle={subtitle}
      subtitleClassName={subtitleClassName}
      topSlot={
        <>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: step === "1/3" ? "33%" : step === "2/3" ? "66%" : "100%" }}
            />
          </div>
          <div className="mb-4 text-xs leading-5 text-muted">{step} 단계</div>
        </>
      }
    >
      <div className="space-y-4">{children}</div>
      <div className="mt-8 space-y-3">
        <button type="button" onClick={() => void handleNext()} className={onboardingPrimaryCtaClass}>
          {nextLabel}
        </button>
        {helperLink && resolvedHelperHref ? (
          <button
            type="button"
            onClick={() => safeNavigate(router, resolvedHelperHref)}
            className="block w-full bg-transparent py-1 text-center text-sm font-normal text-muted underline underline-offset-4"
          >
            {helperLink.label}
          </button>
        ) : null}
        {resolvedPrevHref ? (
          <button
            type="button"
            onClick={handleBack}
            className="block w-full bg-transparent py-1 text-center text-sm font-normal text-muted underline underline-offset-4"
          >
            {prevLabel}
          </button>
        ) : null}
        {postPrevLink && resolvedPostPrevHref ? (
          <button
            type="button"
            onClick={() => safeNavigate(router, resolvedPostPrevHref)}
            className="block w-full bg-transparent py-1 text-center text-sm font-normal text-muted underline underline-offset-4"
          >
            {postPrevLink.label}
          </button>
        ) : null}
      </div>
    </PhoneFrame>
  );
}
