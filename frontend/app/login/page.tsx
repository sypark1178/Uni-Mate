"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { ensureMemberSeeds, loginMemberWithServerFallback } from "@/lib/member-store";
import { clearAllDrafts } from "@/lib/draft-store";

export default function LoginPage() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    ensureMemberSeeds();
  }, []);

  /** 클라이언트 라우터 대신 전체 문서 이동 — Turbo·미리보기에서도 홈으로 확실히 전환 */
  const goDashboard = () => {
    window.location.replace(`${window.location.origin}/dashboard`);
  };

  const handleLogin = async () => {
    const result = await loginMemberWithServerFallback(loginValue, password);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setErrorMessage("");
    clearAllDrafts();
    goDashboard();
  };

  return (
    <PhoneFrame>
      <div className="pt-20 text-center">
        <h1 className="text-[32px] font-bold leading-[38px] text-navy">기존 회원 로그인</h1>
        <p className="mt-3 text-base leading-6 text-muted">아이디(또는 이메일)와 비밀번호로 로그인하세요.</p>
      </div>
      <form
        className="mt-8 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleLogin();
        }}
      >
        <input
          className="w-full rounded-xl border border-line px-4 py-3 focus:border-line focus:outline-none focus:ring-0 focus-visible:outline-none"
          placeholder="아이디 또는 이메일"
          name="login"
          autoComplete="username"
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line px-4 py-3 focus:border-line focus:outline-none focus:ring-0 focus-visible:outline-none"
          placeholder="비밀번호"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {errorMessage ? <p className="text-sm font-semibold text-[#B42318]">{errorMessage}</p> : null}
        <button type="submit" className="flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white">
          로그인
        </button>
      </form>
      <div className="mt-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-xl border border-line bg-[#F0F0F0] px-4 py-3 text-sm font-semibold text-navy"
        >
          처음으로
        </Link>
      </div>
    </PhoneFrame>
  );
}
