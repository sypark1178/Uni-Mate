"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { ensureMemberSeeds, loginMember } from "@/lib/member-store";
import { safeNavigate } from "@/lib/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    ensureMemberSeeds();
  }, []);

  const handleLogin = () => {
    const result = loginMember(loginValue, password);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setErrorMessage("");
    safeNavigate(router, "/dashboard");
  };

  return (
    <PhoneFrame title="로그인" subtitle="기존 분석 결과와 저장한 전략을 이어서 확인할 수 있어요.">
      <div className="space-y-4">
        <input
          className="w-full rounded-xl border border-line px-4 py-3"
          placeholder="이메일 또는 아이디"
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line px-4 py-3"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs leading-5 text-muted">
          기존 등록 회원 3명은 이메일만 입력해도 데모 로그인이 가능합니다.
        </p>
        {errorMessage ? <p className="text-sm font-semibold text-[#B42318]">{errorMessage}</p> : null}
      </div>
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={handleLogin}
          className="flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
        >
          로그인
        </button>
        <Link
          href="/signup?returnTo=%2Flogin"
          className="flex w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-navy"
        >
          회원가입
        </Link>
        <Link href="/" className="block text-center text-sm text-muted underline underline-offset-4">
          랜딩으로 돌아가기
        </Link>
      </div>
    </PhoneFrame>
  );
}
