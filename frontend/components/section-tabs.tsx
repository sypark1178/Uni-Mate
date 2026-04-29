"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { mergeHrefWithSearchParams } from "@/lib/navigation";

type Tab = {
  href: string;
  label: string;
};

type SectionTabsProps = {
  tabs: Tab[];
};

const tabBase = "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold no-underline";

function tabClass(active: boolean) {
  return active ? `${tabBase} border-0 bg-navy text-white` : `${tabBase} border border-line bg-white text-muted`;
}

function SectionTabsFallback({ tabs }: SectionTabsProps) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pr-2">
      {tabs.map((tab) => {
        return (
          <Link key={tab.href} href={tab.href} className={tabClass(false)} prefetch>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function SectionTabsInner({ tabs }: SectionTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pr-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const resolvedHref = mergeHrefWithSearchParams(tab.href, searchParams);
        return (
          <Link key={tab.href} href={resolvedHref} className={tabClass(active)} prefetch>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SectionTabs({ tabs }: SectionTabsProps) {
  return (
    <Suspense fallback={<SectionTabsFallback tabs={tabs} />}>
      <SectionTabsInner tabs={tabs} />
    </Suspense>
  );
}
