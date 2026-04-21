import Link from "next/link";

export function EmptyState() {
  return (
    <section className="rounded-[28px] bg-mist px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-2xl font-semibold text-accent">
        !
      </div>
      <h2 className="text-2xl font-semibold">아직 정보가 없어요</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        기본 정보와 성적을 입력하면 AI가 전형 탐색, 수시 6장 전략, 시뮬레이션까지 이어서 분석해드려요.
      </p>
      <Link href="/onboarding/basic" className="mt-5 inline-flex rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white">
        지금 입력하러 가기
      </Link>
    </section>
  );
}
