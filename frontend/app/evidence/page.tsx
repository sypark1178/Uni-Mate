import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";

export default function EvidencePage() {
  return (
    <>
      <PhoneFrame title="근거 보기" subtitle="Evidence Viewer 단독 화면 버전입니다. 팝업 외에도 독립 문서 확인 동선이 필요할 때 사용할 수 있습니다.">
        <section className="rounded-[24px] bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">서강대학교 입학처 · 27페이지</div>
          <h2 className="mt-2 text-xl font-semibold">2026학년도 수시모집요강</h2>
          <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-6">
            학생부교과 성적 100% 반영, 수능 최저는 국수영탐 중 2개 합 5 이내입니다. 수치 근거가 확보되어 있어 Evidence Viewer와 원문 페이지 연결이 가능합니다.
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
            페이지 번호가 없는 경우에는 동일 영역에 `확인 불가` 배지를 노출하도록 로직을 맞췄습니다.
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
