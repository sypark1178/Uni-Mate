"use client";

import { useEffect, useRef, useState } from "react";

type UploadDropzoneProps = {
  title?: string;
  description?: string;
  buttonLabel?: string;
  initialFiles?: string[];
  onFilesSelected?: (files: File[]) => void;
};

export function UploadDropzone({
  title = "성적표 업로드",
  description = "PDF, 이미지 형태의 성적표를 선택하면 OCR 분석용 파일로 등록됩니다.",
  buttonLabel = "파일 선택",
  initialFiles = [],
  onFilesSelected
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileNames, setFileNames] = useState<string[]>(initialFiles);

  useEffect(() => {
    setFileNames(initialFiles);
  }, [initialFiles]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const nextFiles = files.map((file) => file.name);
    setFileNames(nextFiles);
    onFilesSelected?.(files);
  };

  return (
    <section className="rounded-[24px] border border-dashed border-line bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy/10 text-xl font-semibold text-navy">
        PDF
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 rounded-2xl bg-mist px-4 py-6 text-sm text-muted">
        {fileNames.length > 0 ? (
          <div className="space-y-1 text-left">
            {fileNames.map((name) => (
              <div key={name} className="truncate">
                {name}
              </div>
            ))}
          </div>
        ) : (
          "파일을 선택하면 업로드 목록이 여기에 표시됩니다."
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
      >
        {buttonLabel}
      </button>
    </section>
  );
}
