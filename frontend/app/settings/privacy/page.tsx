"use client";

import { useEffect, useMemo, useState } from "react";
import { PhoneFrame } from "@/components/phone-frame";

type PrivacySettings = {
  checklist: boolean;
  dday: boolean;
  goals: boolean;
  strategySummary: boolean;
  scoreDetails: boolean;
  basicProfile: boolean;
};

type ConnectState = {
  code: string;
  issuedAt: number;
};

const settingsStorageKey = "uni-mate-privacy-settings-v2";
const connectStorageKey = "uni-mate-privacy-connect-v1";

const defaultSettings: PrivacySettings = {
  checklist: false,
  dday: true,
  goals: true,
  strategySummary: true,
  scoreDetails: false,
  basicProfile: true
};

const itemRows: Array<{ key: keyof PrivacySettings; title: string; desc: string }> = [
  { key: "checklist", title: "주간 체크리스트 달성률", desc: "한 주 동안 할 일을 얼마나 달성했는지 공유합니다." },
  { key: "dday", title: "D-Day 입시 일정", desc: "주요 일정을 함께 확인해 공유합니다." },
  { key: "goals", title: "목표 대학 목록", desc: "지원 희망하는 목표 대학 목록을 공유합니다." },
  { key: "strategySummary", title: "AI 전략 요약", desc: "AI가 분석한 입시 전략 내용을 공유합니다." },
  { key: "scoreDetails", title: "성적 세부 데이터", desc: "내신/모의 과목별 성적과 세부 지표를 공유합니다." },
  { key: "basicProfile", title: "기본 정보 요약", desc: "학년/지역/학교을 간단히 정리해 공유합니다." }
];

function generateConnectCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

function formatTimeLeftFrom(now: number, issuedAt: number) {
  const ttlMs = 24 * 60 * 60 * 1000;
  const remain = Math.max(0, ttlMs - (now - issuedAt));
  const hours = Math.floor(remain / (60 * 60 * 1000));
  const mins = Math.floor((remain % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}시간 ${mins}분`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-[30px] w-16 rounded-full transition ${checked ? "bg-navy" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition ${
          checked ? "left-[37px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export default function SettingsPrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [connect, setConnect] = useState<ConnectState>(() => ({ code: generateConnectCode(), issuedAt: Date.now() }));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem(settingsStorageKey);
      if (rawSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(rawSettings) });
      }
      const rawConnect = window.localStorage.getItem(connectStorageKey);
      if (rawConnect) {
        const parsed = JSON.parse(rawConnect) as Partial<ConnectState>;
        if (parsed.code && parsed.issuedAt) {
          setConnect({ code: parsed.code, issuedAt: parsed.issuedAt });
        }
      }
    } catch {
      window.localStorage.removeItem(settingsStorageKey);
      window.localStorage.removeItem(connectStorageKey);
    }
  }, []);

  const updateSetting = (key: keyof PrivacySettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const reissueCode = () => {
    const next = { code: generateConnectCode(), issuedAt: Date.now() };
    setConnect(next);
    window.localStorage.setItem(connectStorageKey, JSON.stringify(next));
    setCopied(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(connect.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      window.alert("코드 복사에 실패했어요. 다시 시도해 주세요.");
    }
  };

  const saveAll = () => {
    window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    window.localStorage.setItem(connectStorageKey, JSON.stringify(connect));
    window.alert("공개 설정이 저장됐어요.");
  };

  const timeLeft = useMemo(() => formatTimeLeftFrom(Date.now(), connect.issuedAt), [connect.issuedAt]);

  return (
    <PhoneFrame title="공개 정보 설정 상세">
      <div className="space-y-4">
        <section className="rounded-2xl bg-[#f3f4f6] px-3 py-3">
          <p className="text-sm font-semibold text-ink">학생의 정보 주도권 보장</p>
          <p className="mt-1 text-xs leading-5 text-muted">아래에서 선택한 항목만 연결된 계정에 확인될 수 있어요. 공개 범위를 설정해보세요.</p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">공개 허용 항목</h2>
          <div className="space-y-2">
            {itemRows.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-2xl border border-line bg-white px-3 py-3">
                <div className="pr-3">
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 overflow-x-auto whitespace-nowrap text-[11px] leading-4 text-muted">{item.desc}</p>
                </div>
                <Toggle checked={settings[item.key]} onChange={() => updateSetting(item.key)} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">계정 연결하기</h2>
          <div className="rounded-2xl border border-line bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">연결 코드 발급</p>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted">연결할 상대의 앱에서 코드를 입력해 주세요.</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[38px] font-bold leading-none tracking-[-0.03em] text-ink">{connect.code}</p>
              <button
                type="button"
                onClick={reissueCode}
                className="h-9 rounded-lg border border-line px-3 text-sm font-medium text-muted"
              >
                새로고침
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted">코드 유효기간: 24시간 | 남은 {timeLeft}</p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="mt-2 box-border flex h-10 w-full items-center justify-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-muted"
            >
              {copied ? "코드 복사됨" : "코드 복사하기"}
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={saveAll}
          className="mt-2 box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-navy bg-navy px-4 py-3 text-sm font-semibold text-white"
        >
          저장하기
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="block w-full bg-transparent py-1 text-center text-sm font-normal text-muted underline underline-offset-4"
        >
          뒤로가기
        </button>
      </div>
    </PhoneFrame>
  );
}
