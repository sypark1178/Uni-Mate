import { Suspense } from "react";

/**
 * useSearchParams 등이 새로고침·직접 URL 진입 시 서버에서 경고/에러 없이 스트리밍되도록
 * 모든 라우트에 공통 Suspense 경계를 둔다. (settings 등 페이지 내부 Suspense와 중첩돼도 무방)
 */
export default function RootTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] w-full items-center justify-center bg-mist px-6 text-center text-sm text-muted">
          불러오는 중…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
