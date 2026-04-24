import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";

const scenarioA = "g1=경희대|경영학과&g2=서강대|경영학부&g3=숭실대|경영학부";
const scenarioB = "g1=부산대|경영학과&g2=경북대|경제통상학부&g3=충남대|경영학부";

export default function QaPage() {
  return (
    <PhoneFrame title="QA 시나리오" subtitle="목표대학 3개와 전략 6장 추천이 올바르게 분리되는지 빠르게 재현할 수 있는 링크입니다.">
      <div className="space-y-4">
        <section className="rounded-[22px] border border-line bg-white p-4">
          <div className="text-lg font-semibold">시나리오 A: 수도권 경영 계열</div>
          <div className="mt-2 text-sm text-muted">경희대 / 서강대 / 숭실대를 목표대학 3개로 설정합니다.</div>
          <div className="mt-4 grid gap-2">
            <Link href={`/onboarding/goals?${scenarioA}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Goals 확인
            </Link>
            <Link href={`/dashboard?${scenarioA}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Dashboard 확인
            </Link>
            <Link href={`/settings?${scenarioA}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Settings 확인
            </Link>
            <Link href={`/strategy?${scenarioA}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Strategy 확인
            </Link>
          </div>
        </section>

        <section className="rounded-[22px] border border-line bg-white p-4">
          <div className="text-lg font-semibold">시나리오 B: 지방국립대 경영/경제 계열</div>
          <div className="mt-2 text-sm text-muted">부산대 / 경북대 / 충남대를 목표대학 3개로 설정합니다.</div>
          <div className="mt-4 grid gap-2">
            <Link href={`/onboarding/goals?${scenarioB}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Goals 확인
            </Link>
            <Link href={`/dashboard?${scenarioB}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Dashboard 확인
            </Link>
            <Link href={`/settings?${scenarioB}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Settings 확인
            </Link>
            <Link href={`/strategy?${scenarioB}`} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy">
              Strategy 확인
            </Link>
          </div>
        </section>
      </div>
    </PhoneFrame>
  );
}
