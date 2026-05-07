import type { NextPageContext } from "next";

/**
 * App Router 전용 프로젝트에서도, 개발 서버가 내부적으로 `/_error` 번들을
 * 찾지 못할 때를 대비한 최소 Pages 오류 페이지.
 */
function PagesError({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
      <p style={{ fontWeight: 600 }}>페이지 처리 중 오류가 발생했습니다.</p>
      {statusCode != null ? <p style={{ color: "#64748b", fontSize: "0.9rem" }}>상태 코드: {statusCode}</p> : null}
    </div>
  );
}

PagesError.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err && typeof err === "object" && "statusCode" in err ? Number(err.statusCode) : undefined;
  return { statusCode };
};

export default PagesError;
