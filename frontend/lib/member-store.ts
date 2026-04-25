"use client";

export type MemberRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  password: string;
  seeded?: boolean;
  createdAt: string;
};

const memberStorageKey = "uni-mate-members";
const currentMemberStorageKey = "uni-mate-current-member";

/** 로그인 입력: 공백·호환 문자 정리 (복사 붙여넣기 대비) */
export function normalizeLoginInput(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "");
  try {
    return trimmed.normalize("NFKC");
  } catch {
    return trimmed;
  }
}

const seededMembers: MemberRecord[] = [
  {
    id: "seed-kim-sohui",
    userId: "gimsohui407",
    name: "김소희",
    email: "gimsohui407@gmail.com",
    password: "",
    seeded: true,
    createdAt: "2026-04-21T00:00:00.000Z"
  },
  {
    id: "seed-an-saemi",
    userId: "sammya0902",
    name: "안새미",
    email: "sammya0902@gmail.com",
    password: "",
    seeded: true,
    createdAt: "2026-04-21T00:00:00.000Z"
  },
  {
    id: "seed-park-sangyun",
    userId: "sypark1178",
    name: "박상윤",
    email: "sypark1178@gmail.com",
    password: "",
    seeded: true,
    createdAt: "2026-04-21T00:00:00.000Z"
  },
  {
    id: "seed-kim-minji",
    userId: "kmg11",
    name: "김민지",
    email: "kmg11@gmail.com",
    password: "",
    seeded: true,
    createdAt: "2026-04-21T00:00:00.000Z"
  }
];

function normalizeMember(raw: unknown): MemberRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const userId = "userId" in raw ? String(raw.userId ?? "").trim() : "";
  const email = "email" in raw ? String(raw.email ?? "").trim().toLowerCase() : "";
  const name = "name" in raw ? String(raw.name ?? "").trim() : "";

  if (!userId || !email || !name) {
    return null;
  }

  return {
    id: "id" in raw ? String(raw.id ?? `${userId}-${email}`) : `${userId}-${email}`,
    userId,
    name,
    email,
    password: "password" in raw ? String(raw.password ?? "") : "",
    seeded: "seeded" in raw ? Boolean(raw.seeded) : false,
    createdAt: "createdAt" in raw ? String(raw.createdAt ?? new Date().toISOString()) : new Date().toISOString()
  };
}

function readStoredMembers(): MemberRecord[] {
  if (typeof window === "undefined") {
    return seededMembers;
  }

  try {
    const raw = window.localStorage.getItem(memberStorageKey);
    if (!raw) {
      return seededMembers;
    }

    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return seededMembers;
    }

    return parsed.map(normalizeMember).filter((item): item is MemberRecord => item !== null);
  } catch {
    return seededMembers;
  }
}

function writeStoredMembers(members: MemberRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(memberStorageKey, JSON.stringify(members));
}

function mergeSeedMembers(members: MemberRecord[]) {
  const merged = [...members];

  seededMembers.forEach((seededMember) => {
    const exists = merged.some(
      (member) =>
        member.userId.toLowerCase() === seededMember.userId.toLowerCase() ||
        member.email.toLowerCase() === seededMember.email.toLowerCase()
    );

    if (!exists) {
      merged.push(seededMember);
    }
  });

  return merged;
}

export function ensureMemberSeeds() {
  const members = mergeSeedMembers(readStoredMembers());
  writeStoredMembers(members);
  return members;
}

export function getAllMembers() {
  return ensureMemberSeeds();
}

export function registerMember(input: Pick<MemberRecord, "userId" | "name" | "email" | "password">) {
  const members = ensureMemberSeeds();
  const normalizedUserId = input.userId.trim();
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim();

  if (!normalizedUserId || !normalizedEmail || !normalizedName) {
    return { ok: false as const, error: "아이디, 이름, 이메일은 필수입니다." };
  }

  const duplicate = members.find(
    (member) =>
      member.userId.toLowerCase() === normalizedUserId.toLowerCase() ||
      member.email.toLowerCase() === normalizedEmail
  );

  if (duplicate) {
    return { ok: false as const, error: "이미 등록된 회원입니다." };
  }

  const nextMember: MemberRecord = {
    id: `${normalizedUserId}-${Date.now()}`,
    userId: normalizedUserId,
    name: normalizedName,
    email: normalizedEmail,
    password: input.password,
    createdAt: new Date().toISOString()
  };

  const nextMembers = [...members, nextMember];
  writeStoredMembers(nextMembers);
  return { ok: true as const, member: nextMember };
}

export function loginMember(loginValue: string, passwordValue: string) {
  const members = ensureMemberSeeds();
  const normalizedLogin = normalizeLoginInput(loginValue);
  const normalizedPassword = passwordValue.trim();

  const seedMatch =
    seededMembers.find(
      (item) => item.email.toLowerCase() === normalizedLogin || item.userId.toLowerCase() === normalizedLogin
    ) ?? null;

  const fromStore = members.find(
    (item) => item.email.toLowerCase() === normalizedLogin || item.userId.toLowerCase() === normalizedLogin
  );

  /** 시드 아이디·이메일은 로컬 목록이 덮어써도 시드 정의로만 인증 (비번 오염 시에도 데모 로그인 유지) */
  const member = seedMatch ?? fromStore;

  if (!member) {
    return { ok: false as const, error: "등록된 회원을 찾지 못했습니다." };
  }

  /** 저장 비밀번호가 비어 있거나 안새미 계정은 입력 비번 검사 생략 */
  const storedPw = String(member.password ?? "").trim();
  const passwordOptional =
    member.email.toLowerCase() === "sammya0902@gmail.com" ||
    member.userId.toLowerCase() === "sammya0902" ||
    storedPw === "";

  if (!passwordOptional && storedPw !== normalizedPassword) {
    return { ok: false as const, error: "비밀번호가 일치하지 않습니다." };
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(currentMemberStorageKey, JSON.stringify(member));
    } catch {
      /* 저장 실패해도 세션 이동은 진행 (비공개 모드 등) */
    }
  }

  return { ok: true as const, member };
}

function upsertMemberInStore(next: MemberRecord) {
  if (typeof window === "undefined") {
    return;
  }
  const members = ensureMemberSeeds();
  const idx = members.findIndex((m) => m.userId.toLowerCase() === next.userId.toLowerCase());
  const merged =
    idx === -1
      ? [...members, next]
      : members.map((m, i) => (i === idx ? { ...next, id: m.id, createdAt: m.createdAt } : m));
  writeStoredMembers(merged);
}

/**
 * 로컬 가입 회원 우선, 없으면 SQLite(TB_USER / TB_USER_AUTH) 기반 로그인.
 */
export async function loginMemberWithServerFallback(loginValue: string, passwordValue: string) {
  const local = loginMember(loginValue, passwordValue);
  if (local.ok) {
    return local;
  }
  if (local.error !== "등록된 회원을 찾지 못했습니다.") {
    return local;
  }

  if (typeof window === "undefined") {
    return local;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: loginValue.trim(), password: passwordValue })
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      data?: { userId: string; name: string; email: string };
    };

    if (!response.ok || !payload.ok || !payload.data) {
      return { ok: false as const, error: payload.error || "등록된 회원을 찾지 못했습니다." };
    }

    const d = payload.data;
    const member: MemberRecord = {
      id: `db-${d.userId}`,
      userId: d.userId,
      name: d.name,
      email: d.email.trim().toLowerCase(),
      password: "",
      seeded: false,
      createdAt: new Date().toISOString()
    };
    upsertMemberInStore(member);
    window.localStorage.setItem(currentMemberStorageKey, JSON.stringify(member));
    return { ok: true as const, member };
  } catch {
    return { ok: false as const, error: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export function getCurrentMember() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(currentMemberStorageKey);
    return raw ? normalizeMember(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function logoutMember() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(currentMemberStorageKey);
}

export function setCurrentMember(member: MemberRecord) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(currentMemberStorageKey, JSON.stringify(member));
}
