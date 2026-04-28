const onboardingFieldShell = "w-full rounded-xl border border-line px-4 py-3";

/** 인풋: 입력 텍스트는 ink, 플레이스홀더만 디자인 토큰 `muted`(#667085)와 동일 */
export const onboardingFormFieldClass = `${onboardingFieldShell} text-ink placeholder:text-muted`;

/**
 * 셀렉트: `required` + 빈 값용 `<option value="" disabled>`일 때 닫힌 상태도 `muted`와 동일 톤.
 * 선택 후에는 `text-ink` (signup·goals 등 다른 페이지와 같은 기준).
 */
export const onboardingSelectFieldClass = `${onboardingFieldShell} uni-mate-onboarding-select text-ink invalid:text-muted`;

/** 온보딩 전역 primary CTA — 1px 테두리로 border-line 입력·보조 버튼과 동일한 박스 모델 */
export const onboardingPrimaryCtaClass =
  "box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-navy bg-navy px-4 py-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50";

/** 보조 버튼(테두리형) — primary와 동일한 수평 폭·패딩 기준 */
export const onboardingSecondaryOutlineCtaClass =
  "box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-muted";

/** 하단 텍스트형 보조 CTA(2단계 성적 입력의「뒤로가기」 등) */
export const onboardingMutedTextCtaClass = "block w-full text-center text-sm text-muted";
