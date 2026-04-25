type RadarCardProps = {
  academicFit: number;
  majorFit: number;
  minRequirement: number;
};

export function RadarCard({ academicFit, majorFit, minRequirement }: RadarCardProps) {
  const points = [
    [70, 8],
    [130, 40],
    [110, 124],
    [30, 124],
    [10, 40]
  ];
  const values = [academicFit, majorFit, minRequirement, 72, 68];
  const polygon = values
    .map((value, index) => {
      const [x, y] = points[index];
      const ratio = value / 100;
      const px = 70 + (x - 70) * ratio;
      const py = 72 + (y - 72) * ratio;
      return `${px},${py}`;
    })
    .join(" ");

  return (
    <section className="rounded-[24px] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">합격 가능성 체크</h3>
        <span className="text-xs text-muted">W1 / W2 / W3 기반</span>
      </div>
      <svg viewBox="0 0 140 140" className="mx-auto block h-[210px] w-full max-w-[260px]">
        <polygon points="70,4 136,42 112,132 28,132 4,42" fill="#E8F1FA" stroke="#B3C8DC" />
        <polygon points="70,22 118,50 100,116 40,116 22,50" fill="none" stroke="#B3C8DC" strokeDasharray="4 4" />
        <polygon points={polygon} fill="rgba(21,53,106,0.22)" stroke="#15356A" strokeWidth="2" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-mist px-3 py-2">
          <div className="text-muted">내신 적합도</div>
          <div className="mt-1 font-semibold text-navy">{academicFit}</div>
        </div>
        <div className="rounded-2xl bg-mist px-3 py-2">
          <div className="text-muted">전공 적합도</div>
          <div className="mt-1 font-semibold text-navy">{majorFit}</div>
        </div>
        <div className="rounded-2xl bg-mist px-3 py-2">
          <div className="text-muted">최저 충족</div>
          <div className="mt-1 font-semibold text-navy">{minRequirement}</div>
        </div>
      </div>
    </section>
  );
}
