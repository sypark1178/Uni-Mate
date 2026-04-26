import type { ReactNode } from "react";

type PhoneFrameProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** 부제목 `<p>`에 추가할 클래스 (예: 한 줄 고정) */
  subtitleClassName?: string;
  topSlot?: ReactNode;
  fullBleed?: boolean;
  statusBarClassName?: string;
  bottomPaddingClassName?: string;
  /** 휴대폰 프레임(세로 쉘) 배경. 기본 흰색 */
  deviceClassName?: string;
};

export function PhoneFrame({
  children,
  title,
  subtitle,
  subtitleClassName,
  topSlot,
  fullBleed = false,
  statusBarClassName = "bg-white",
  bottomPaddingClassName = "pb-[66px]",
  deviceClassName = "bg-white"
}: PhoneFrameProps) {
  return (
    <main className="app-shell flex min-h-screen justify-center px-1 py-0">
      <section className={`relative flex h-[852px] w-[393px] flex-col overflow-hidden ${deviceClassName}`}>
        <header className={`absolute left-0 right-0 top-0 z-20 flex h-[44px] items-center justify-between px-[21px] ${statusBarClassName}`}>
          <div className="text-[15px] font-semibold text-black">9:41</div>
          <div className="flex items-center gap-[5px]">
            <div className="h-[11px] w-[17px]">
              <svg viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="0" y="8" width="3" height="3" rx="1" fill="black" />
                <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" fill="black" />
                <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="black" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" fill="black" />
              </svg>
            </div>
            <div className="h-[13px] w-[17px]">
              <svg viewBox="0 0 17 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8.5 0C5.1 0 2 1.3 0 3.5L1.5 5C3.2 3.2 5.7 2.2 8.5 2.2C11.3 2.2 13.8 3.2 15.5 5L17 3.5C15 1.3 11.9 0 8.5 0Z" fill="black" />
                <path d="M8.5 4.5C6.5 4.5 4.6 5.3 3.3 6.6L4.8 8.1C5.7 7.2 7 6.7 8.5 6.7C10 6.7 11.3 7.2 12.2 8.1L13.7 6.6C12.4 5.3 10.5 4.5 8.5 4.5Z" fill="black" />
                <path d="M8.5 13L5.5 9.5C6.3 8.7 7.3 8.2 8.5 8.2C9.7 8.2 10.7 8.7 11.5 9.5L8.5 13Z" fill="black" />
              </svg>
            </div>
            <div className="h-3 w-[25px]">
              <svg viewBox="0 0 25 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="black" strokeOpacity="0.35" />
                <path d="M22.5 4C23.5 4 24 4.5 24 6C24 7.5 23.5 8 22.5 8" stroke="black" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
                <rect x="2" y="2" width="18" height="8" rx="1.5" fill="black" />
              </svg>
            </div>
          </div>
        </header>
        <div
          className={
            fullBleed
              ? `min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${bottomPaddingClassName} pt-11`
              : `min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 ${bottomPaddingClassName} pt-14`
          }
        >
          {topSlot}
          {(title || subtitle) && (
            <header className="pb-3">
              {title && <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>}
              {subtitle && (
                <div className={subtitleClassName?.includes("whitespace-nowrap") ? "mt-2 -mx-1 overflow-x-auto px-1" : "mt-2"}>
                  <p
                    className={
                      subtitleClassName ? `text-muted ${subtitleClassName}` : "text-sm leading-6 text-muted"
                    }
                  >
                    {subtitle}
                  </p>
                </div>
              )}
            </header>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
