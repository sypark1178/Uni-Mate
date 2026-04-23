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
    <PhoneFrame>
      <div className="pt-20 text-center">
        <h1 className="text-[32px] font-bold leading-[38px] text-navy">기존 회원 로그인</h1>
        <p className="mt-3 text-base leading-6 text-white/90">
          아이디와 비밀번호로
          <br />
          Uni-Mate에 로그인하세요.
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <input
          className="w-full rounded-xl border border-line px-4 py-3 focus:border-line focus:outline-none focus:ring-0 focus-visible:outline-none"
          placeholder="아이디 입력"
          value={loginValue}
          onChange={(event) => setLoginValue(event.target.value)}
        />
        <input
          className="w-full rounded-xl border border-line px-4 py-3 focus:border-line focus:outline-none focus:ring-0 focus-visible:outline-none"
          placeholder="비밀번호 입력"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
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
          href="/"
          className="flex w-full items-center justify-center rounded-xl border border-line bg-[#F0F0F0] px-4 py-3 text-sm font-semibold text-navy"
        >
          처음으로
        </Link>
      </div>
    </PhoneFrame>
  );
}
