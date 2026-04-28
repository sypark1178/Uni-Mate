/** 라인 박스 안 입력·선택(이름/유형/지역 등) — 값·플레이스홀더 모두 동일 회색(`muted`) */
export const onboardingFormFieldClass =
  "w-full rounded-xl border border-line px-4 py-3 text-muted placeholder:text-muted";

/** 온보딩 전역 primary CTA — 1px 테두리로 border-line 입력·보조 버튼과 동일한 박스 모델 */
export const onboardingPrimaryCtaClass =
  "box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-navy bg-navy px-4 py-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50";

/** 보조 버튼(테두리형) — primary와 동일한 수평 폭·패딩 기준 */
export const onboardingSecondaryOutlineCtaClass =
  "box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-muted";

/** 하단 텍스트형 보조 CTA(2단계 성적 입력의「뒤로가기」 등) */
export const onboardingMutedTextCtaClass = "block w-full text-center text-sm text-muted";
