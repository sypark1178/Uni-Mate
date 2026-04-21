type GapAnalysisCardProps = {
  title: string;
  current: string;
  target: string;
  action: string;
};

export function GapAnalysisCard({ title, current, target, action }: GapAnalysisCardProps) {
  return (
    <article className="rounded-[22px] border border-line bg-white p-4 shadow-sm">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-mist px-4 py-3">
          <div className="text-xs text-muted">현재</div>
          <div className="mt-1 font-semibold text-navy">{current}</div>
        </div>
        <div className="rounded-2xl bg-mist px-4 py-3">
          <div className="text-xs text-muted">목표</div>
          <div className="mt-1 font-semibold text-navy">{target}</div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-sm leading-6 text-muted">
        {action}
      </div>
    </article>
  );
}
