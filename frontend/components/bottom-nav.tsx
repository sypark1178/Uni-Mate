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
  const color = active ? "#15356A" : "#111111";

  if (icon === "home") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <path d="M6 13.5L16 5l10 8.5V28H6V13.5z" fill={color} />
      </svg>
    );
  }

  if (icon === "strategy") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <path d="M8 4h16v17H18l-4 7v-7H8V4z" fill={color} />
      </svg>
    );
  }

  if (icon === "analysis") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <path d="M6 24V19h4v5H6zm8 0V10h4v14h-4zm8 0V14h4v10h-4z" fill={color} />
      </svg>
    );
  }

  if (icon === "execution") {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <circle cx="16" cy="16" r="11" fill="none" stroke={color} strokeWidth="2.5" />
        <path
          d="M12.2 16.5l2.7 2.7 5.4-6.2"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="none" stroke={color} strokeWidth="2.4" />
      <path
        d="M16 5v4M16 23v4M5 16h4M23 16h4M8.3 8.3l2.8 2.8M20.9 20.9l2.8 2.8M23.7 8.3l-2.8 2.8M11.1 20.9l-2.8 2.8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <nav className="pointer-events-auto fixed bottom-0 left-1/2 z-[70] grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-line bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(17,24,39,0.08)] backdrop-blur">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const resolvedHref = mergeHrefWithSearchParams(item.href, searchParams);
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => safeNavigate(router, resolvedHref)}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] ${
              active ? "font-semibold text-navy" : "text-[#111111]"
            }`}
          >
            <NavIcon icon={item.icon} active={active} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
