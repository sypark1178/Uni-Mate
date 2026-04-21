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
  const normalizedLogin = loginValue.trim().toLowerCase();
  const normalizedPassword = passwordValue.trim();

  const member = members.find(
    (item) => item.email.toLowerCase() === normalizedLogin || item.userId.toLowerCase() === normalizedLogin
  );

  if (!member) {
    return { ok: false as const, error: "등록된 회원을 찾지 못했습니다." };
  }

  if (!member.seeded && member.password !== normalizedPassword) {
    return { ok: false as const, error: "비밀번호가 일치하지 않습니다." };
  }

  if (member.seeded && member.password && member.password !== normalizedPassword) {
    return { ok: false as const, error: "비밀번호가 일치하지 않습니다." };
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(currentMemberStorageKey, JSON.stringify(member));
  }

  return { ok: true as const, member };
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
