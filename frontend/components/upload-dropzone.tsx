"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type UploadDropzoneProps = {
  title?: string;
  description?: ReactNode;
  metaText?: ReactNode;
  buttonLabel?: string;
  saveButtonLabel?: string;
  initialFiles?: string[];
  onFilesSelected?: (files: File[]) => void;
  onFilesDeleted?: (fileNames: string[]) => void;
  onSave?: () => void | Promise<void>;
};

export function UploadDropzone({
  title = "성적표 업로드",
  description = "PDF, 이미지 형태의 성적표를 선택하면 OCR 분석용 파일로 등록됩니다.",
  metaText = "PDF 또는 사진 / 최대 10MB",
  buttonLabel = "파일 선택",
  saveButtonLabel = "저장하기",
  initialFiles = [],
  onFilesSelected,
  onFilesDeleted,
  onSave
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileNames, setFileNames] = useState<string[]>(initialFiles);
  const [checkedNames, setCheckedNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  useEffect(() => {
    setFileNames(initialFiles);
    setCheckedNames([]);
  }, [initialFiles]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const nextFiles = files.map((file) => file.name);
    setFileNames(nextFiles);
    setCheckedNames([]);
    onFilesSelected?.(files);
  };

  const toggleChecked = (name: string, checked: boolean) => {
    setCheckedNames((previous) => {
      if (checked) {
        return previous.includes(name) ? previous : [...previous, name];
      }
      return previous.filter((item) => item !== name);
    });
  };

  const handleDelete = () => {
    if (checkedNames.length === 0) {
      return;
    }
    const targets = new Set(checkedNames);
    setFileNames((previous) => previous.filter((name) => !targets.has(name)));
    onFilesDeleted?.(checkedNames);
    setCheckedNames([]);
  };

  const handleSave = async () => {
    if (!onSave || isSaving || fileNames.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave();
      setSaveNotice("저장되었습니다");
      window.setTimeout(() => setSaveNotice(""), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="box-border w-full rounded-[24px] border border-line bg-white p-5 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy/10 text-2xl text-navy">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M8.5 3.5H15L19 7.5V18C19 19.1 18.1 20 17 20H8.5C7.4 20 6.5 19.1 6.5 18V5.5C6.5 4.4 7.4 3.5 8.5 3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M15 3.5V7.5H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M5 7H6.5V18C6.5 19.1 7.4 20 8.5 20H15V21H7.5C6.1 21 5 19.9 5 18.5V7Z"
            fill="currentColor"
            opacity="0.25"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted">{metaText}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 rounded-2xl bg-mist px-4 py-5 text-sm text-muted">
        {fileNames.length > 0 ? (
          <div className="space-y-3 text-left">
            <div className="space-y-2">
              {fileNames.map((name, index) => (
                <label key={`${name}-${index}`} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={checkedNames.includes(name)}
                    onChange={(event) => toggleChecked(name, event.target.checked)}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={checkedNames.length === 0}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        ) : (
          <>선택한 파일 목록이 여기에 표시됩니다.</>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleChange}
      />
      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
        >
          {buttonLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={!onSave || isSaving || fileNames.length === 0}
          className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold ${
            !onSave || isSaving || fileNames.length === 0
              ? "border-line bg-white text-muted disabled:cursor-not-allowed disabled:opacity-50"
              : "border-navy bg-navy text-white"
          }`}
        >
          {isSaving ? "저장 중..." : saveButtonLabel}
        </button>
        {saveNotice ? <p className="text-xs font-semibold text-navy">{saveNotice}</p> : null}
      </div>
    </section>
  );
}
