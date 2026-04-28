"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-mist px-6 py-12 text-center">
      <p className="text-base font-medium text-ink">화면을 불러오지 못했습니다.</p>
      <p className="max-w-sm text-sm text-muted">잠시 후 다시 시도해 주세요. 입력하신 데이터는 이 기기에 저장된 경우 그대로 유지됩니다.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-muted"
      >
        다시 시도
      </button>
    </div>
  );
}
