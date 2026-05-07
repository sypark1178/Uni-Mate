"use client";

/** 루트 레이아웃까지 실패할 때 표시 (`globals.css` 없이 최소 마크업) */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#f4f6f8", color: "#1a1a1e" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center"
          }}
        >
          <p style={{ fontWeight: 600 }}>치명적인 오류가 발생했습니다.</p>
          {error.digest ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>코드: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              borderRadius: "12px",
              border: "1px solid #d4dae2",
              background: "#fff",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 600
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
