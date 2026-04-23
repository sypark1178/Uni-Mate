"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";

const items = [
  { href: "/dashboard", label: "홈", icon: "home" },
  { href: "/strategy", label: "전략", icon: "strategy" },
  { href: "/analysis", label: "분석", icon: "analysis" },
  { href: "/execution", label: "실행", icon: "execution" },
  { href: "/settings", label: "설정", icon: "setting" }
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const strokeColor = active ? "#163c77" : "black";

  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }

  if (icon === "strategy") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="13" y2="18" />
      </svg>
    );
  }

  if (icon === "analysis") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="17" y1="17" x2="17" y2="10" />
        <line x1="12" y1="17" x2="12" y2="7" />
        <line x1="7" y1="17" x2="7" y2="13" />
      </svg>
    );
  }

  if (icon === "execution") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="8 12 11 15 16 9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="pointer-events-auto fixed bottom-0 left-1/2 z-[70] flex h-[58px] w-full max-w-[393px] -translate-x-1/2 items-stretch border-t border-[#F0F0F0] bg-white px-0">
      {items.map((item) => {
        const resolvedHref = mergeHrefWithSearchParams(item.href, searchParams);
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => safeNavigate(router, resolvedHref)}
            className={`flex h-full w-1/5 min-w-0 flex-col items-center justify-center gap-0.5 bg-white px-0 text-[11px] font-medium leading-none ${
              isActive ? "text-navy" : "text-black"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center">
              <NavIcon icon={item.icon} active={isActive} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
