import Link from "next/link";

export function SaveResultCard() {
  return (
    <section className="rounded-[24px] border border-navy bg-white p-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Save Result</div>
      <h2 className="text-2xl font-semibold">분석 결과 저장</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        현재 결과를 저장하면 다음 방문에도 전략, 근거, 체크리스트를 이어서 볼 수 있습니다. 계정 생성 없이 본 흐름에서 바로 연동되도록 구성했습니다.
      </p>
      <div className="mt-5 grid gap-3">
        <Link href="/signup?provider=email" className="rounded-xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white">
          이메일로 가입하기
        </Link>
        <Link href="/signup?provider=kakao" className="rounded-xl border border-line px-4 py-3 text-center text-sm font-semibold text-navy">
          카카오로 가입하기
        </Link>
      </div>
    </section>
  );
}
