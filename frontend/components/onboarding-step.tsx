"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { safeNavigate } from "@/lib/navigation";

type OnboardingStepProps = {
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  prevHref?: string;
  prevLabel?: string;
  nextHref: string;
  nextLabel: string;
  helperLink?: { href: string; label: string };
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
  children,
  prevHref,
  prevLabel = "이전으로",
  nextHref,
  nextLabel,
  helperLink,
  onNext
}: OnboardingStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedPrevHref = prevHref ? mergeSearchParams(prevHref, searchParams) : undefined;
  const resolvedNextHref = mergeSearchParams(nextHref, searchParams);
  const resolvedHelperHref = helperLink ? mergeSearchParams(helperLink.href, searchParams) : undefined;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (resolvedPrevHref) {
      safeNavigate(router, resolvedPrevHref);
    }
  };

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    }
    safeNavigate(router, resolvedNextHref);
  };

  return (
    <PhoneFrame title={title} subtitle={subtitle}>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-navy"
          style={{ width: step === "1/3" ? "33%" : step === "2/3" ? "66%" : "100%" }}
        />
      </div>
      <div className="mb-4 text-sm text-muted">{step} 단계</div>
      <div className="space-y-4">{children}</div>
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => void handleNext()}
          className="flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
        >
          {nextLabel}
        </button>
        {resolvedPrevHref ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex w-full items-center justify-center rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted"
          >
            {prevLabel}
          </button>
        ) : null}
        {helperLink && resolvedHelperHref ? (
          <button
            type="button"
            onClick={() => safeNavigate(router, resolvedHelperHref)}
            className="block w-full text-center text-sm text-muted underline underline-offset-4"
          >
            {helperLink.label}
          </button>
        ) : null}
      </div>
    </PhoneFrame>
  );
}
