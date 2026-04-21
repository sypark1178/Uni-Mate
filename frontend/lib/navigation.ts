type SearchParamsLike = {
  forEach: (callback: (value: string, key: string) => void) => void;
};

type RouterLike = {
  push: (href: string) => void;
  replace?: (href: string) => void;
};

export function mergeHrefWithSearchParams(href: string, currentParams?: SearchParamsLike | null) {
  if (!href.startsWith("/") || !currentParams) {
    return href;
  }

  const [pathname, queryString] = href.split("?");
  const mergedParams = new URLSearchParams(queryString ?? "");

  currentParams.forEach((value, key) => {
    if (!mergedParams.has(key)) {
      mergedParams.set(key, value);
    }
  });

  const nextQuery = mergedParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function safeNavigate(router: RouterLike, href: string, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") {
    if (mode === "replace" && router.replace) {
      router.replace(href);
      return;
    }

    router.push(href);
    return;
  }

  const target = new URL(href, window.location.origin);
  const targetPath = `${target.pathname}${target.search}`;
  const fallbackTimer = window.setTimeout(() => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== targetPath) {
      window.location.assign(targetPath);
    }
  }, 180);

  try {
    if (mode === "replace" && router.replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  } catch {
    window.clearTimeout(fallbackTimer);
    window.location.assign(targetPath);
  }
}
