import Link from "next/link";
import Image from "next/image";
import { PhoneFrame } from "@/components/phone-frame";

export default function LandingPage() {
  return (
    <PhoneFrame fullBleed>
      <section className="flex h-full flex-col items-center justify-center bg-navy px-8 pb-10 pt-[54px] text-center text-white">
        <div className="mb-8 h-24 w-24 overflow-hidden rounded-[22px] bg-white">
          <Image src="/unimate-logo-cropped.png" alt="Uni-Mate logo" width={96} height={96} className="h-full w-full object-contain" />
        </div>
        <h1 className="text-5xl font-semibold tracking-[-0.05em]">Uni-MATE</h1>
        <p className="mt-4 text-lg text-white/80">나의 입시 전략 파트너</p>
        <div className="mt-12 w-full space-y-3">
          <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-4 text-base font-semibold text-ink">
            기존 회원 로그인 하기
          </Link>
          <Link href="/onboarding/basic" className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-base font-semibold">
            가입 없이 시작하기
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/70">가입 없이 바로 사용하고, 저장 시 계정 연동으로 이어집니다.</p>
      </section>
    </PhoneFrame>
  );
}
