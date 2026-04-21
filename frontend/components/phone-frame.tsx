import type { ReactNode } from "react";

type PhoneFrameProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function PhoneFrame({ children, title, subtitle }: PhoneFrameProps) {
  return (
    <main className="app-shell flex min-h-screen justify-center px-4 py-6">
      <section className="w-full max-w-[430px] overflow-hidden rounded-phone border border-white/70 bg-white shadow-soft">
        <div className="flex items-center justify-between px-6 pb-3 pt-5 text-sm font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-5 rounded bg-black" />
            <span className="h-3 w-4 rounded bg-black" />
            <span className="h-3 w-6 rounded border border-black bg-white" />
          </div>
        </div>
        {(title || subtitle) && (
          <header className="px-6 pb-3">
            {title && <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>}
            {subtitle && <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>}
          </header>
        )}
        <div className="px-6 pb-28">{children}</div>
      </section>
    </main>
  );
}
