"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";

type Tab = {
  href: string;
  label: string;
};

type SectionTabsProps = {
  tabs: Tab[];
};

export function SectionTabs({ tabs }: SectionTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const resolvedHref = mergeHrefWithSearchParams(tab.href, searchParams);
        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => safeNavigate(router, resolvedHref)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              active ? "bg-navy text-white" : "border border-line bg-white text-muted"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
