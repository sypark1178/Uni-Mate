import { Suspense } from "react";
import { PhoneFrame } from "@/components/phone-frame";
import { SignupForm } from "@/components/signup-form";

function SignupFallback() {
  return (
    <PhoneFrame title="회원가입" subtitle="화면을 준비하고 있어요.">
      <p className="text-sm text-muted">불러오는 중…</p>
    </PhoneFrame>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
