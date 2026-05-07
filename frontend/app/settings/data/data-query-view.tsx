"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";
import { readJsonResponse } from "@/lib/read-json-response";

type TableMeta = {
  name: string;
  type: string;
  rowCount: number | null;
};

type TablesResponse = {
  ok: boolean;
  dbPath?: string;
  tables?: TableMeta[];
  error?: string;
};

type QueryResult = {
  ok: boolean;
  dbPath?: string;
  sql?: string;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
  rowCount?: number;
  truncated?: boolean;
  maxRows?: number;
  elapsedMs?: number;
  error?: string;
};

const actionButtonClass =
  "inline-flex h-[41px] min-w-[84px] items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-muted";
const primaryButtonClass =
  "inline-flex h-[44px] items-center justify-center rounded-xl bg-navy px-4 text-sm font-semibold text-white";

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, "\"\"")}"`;
}

function buildPreviewSql(tableName: string) {
  return `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 50`;
}

function buildCountSql(tableName: string) {
  return `SELECT COUNT(*) AS row_count FROM ${quoteIdentifier(tableName)}`;
}

function buildSchemaSql(tableName: string) {
  return `PRAGMA table_info(${quoteIdentifier(tableName)})`;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function DataQueryView() {
  const searchParams = useSearchParams();
  const returnHref = useMemo(() => mergeHrefWithSearchParams("/settings", searchParams), [searchParams]);

  const [tables, setTables] = useState<TableMeta[]>([]);
  const [dbPath, setDbPath] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [sql, setSql] = useState("");
  const [maxRows, setMaxRows] = useState("100");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [runningQuery, setRunningQuery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTable = useMemo(
    () => tables.find((table) => table.name === selectedTable) ?? null,
    [selectedTable, tables]
  );

  const runQuery = async (nextSql: string, nextMaxRows: string) => {
    setRunningQuery(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dev/db-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: nextSql,
          maxRows: Number(nextMaxRows) || 100
        })
      });

      const payload = await readJsonResponse<QueryResult>(response);
      if (!payload) {
        setResult(null);
        setErrorMessage("응답을 읽지 못했습니다.");
        return;
      }

      setResult(payload);
      if (!response.ok || payload.ok === false) {
        setErrorMessage(payload.error ?? "쿼리 실행 중 오류가 발생했습니다.");
      } else {
        setDbPath(payload.dbPath ?? dbPath);
      }
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "쿼리 실행 중 오류가 발생했습니다.");
    } finally {
      setRunningQuery(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadTables = async () => {
      setLoadingTables(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/dev/db-query", {
          method: "GET",
          cache: "no-store"
        });
        const payload = await readJsonResponse<TablesResponse>(response);
        if (!payload || payload.ok === false) {
          if (!cancelled) {
            setErrorMessage(payload?.error ?? "테이블 목록을 불러오지 못했습니다.");
          }
          return;
        }

        const nextTables = Array.isArray(payload.tables) ? payload.tables : [];
        if (cancelled) {
          return;
        }

        setTables(nextTables);
        setDbPath(payload.dbPath ?? "");

        if (nextTables.length > 0 && !sql.trim()) {
          const previewSql = buildPreviewSql(nextTables[0].name);
          setSelectedTable(nextTables[0].name);
          setSql(previewSql);
          void runQuery(previewSql, maxRows);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "테이블 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTables(false);
        }
      }
    };

    void loadTables();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PhoneFrame title="데이터 조회" subtitle="읽기 전용 SQL 조회">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href={returnHref} prefetch className={actionButtonClass}>
            설정으로
          </Link>
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => {
              setSql("");
              setResult(null);
              setErrorMessage(null);
            }}
          >
            초기화
          </button>
        </div>

        <section className="mb-5 rounded-[22px] border border-line bg-white p-4">
          <div className="text-sm font-semibold text-black">연결 정보</div>
          <div className="mt-2 text-xs leading-5 text-muted">
            <div>DB 파일: {dbPath || "불러오는 중"}</div>
            <div>허용 쿼리: SELECT / WITH / PRAGMA / EXPLAIN</div>
            <div>수정 쿼리는 차단됩니다.</div>
          </div>
        </section>

        <section className="mb-5 rounded-[22px] border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black">테이블 목록</div>
              <div className="mt-1 text-xs text-muted">테이블을 누르면 샘플 조회 SQL이 자동으로 들어갑니다.</div>
            </div>
            <button
              type="button"
              className={actionButtonClass}
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>

          {loadingTables ? (
            <div className="text-sm text-muted">테이블을 불러오는 중입니다.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {tables.map((table) => {
                const selected = table.name === selectedTable;
                return (
                  <button
                    key={table.name}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected ? "border-navy bg-safe" : "border-line bg-white"
                    }`}
                    onClick={() => {
                      const previewSql = buildPreviewSql(table.name);
                      setSelectedTable(table.name);
                      setSql(previewSql);
                      void runQuery(previewSql, maxRows);
                    }}
                  >
                    <div className="text-sm font-semibold text-black">{table.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {table.type}
                      {typeof table.rowCount === "number" ? ` · ${table.rowCount} rows` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-5 rounded-[22px] border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black">SQL 실행</div>
              <div className="mt-1 text-xs text-muted">Ctrl+Enter 또는 Cmd+Enter로 바로 실행할 수 있습니다.</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted" htmlFor="db-query-max-rows">
                최대 행
              </label>
              <input
                id="db-query-max-rows"
                value={maxRows}
                onChange={(event) => setMaxRows(event.target.value.replace(/[^\d]/g, "").slice(0, 3) || "1")}
                className="h-10 w-20 rounded-lg border border-line px-3 text-sm"
                inputMode="numeric"
              />
            </div>
          </div>

          {activeTable ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={actionButtonClass}
                onClick={() => {
                  const previewSql = buildPreviewSql(activeTable.name);
                  setSql(previewSql);
                }}
              >
                샘플 조회
              </button>
              <button
                type="button"
                className={actionButtonClass}
                onClick={() => {
                  const countSql = buildCountSql(activeTable.name);
                  setSql(countSql);
                }}
              >
                건수 조회
              </button>
              <button
                type="button"
                className={actionButtonClass}
                onClick={() => {
                  const schemaSql = buildSchemaSql(activeTable.name);
                  setSql(schemaSql);
                }}
              >
                스키마 조회
              </button>
            </div>
          ) : null}

          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void runQuery(sql, maxRows);
              }
            }}
            className="min-h-[180px] w-full rounded-2xl border border-line bg-[#F8FAFC] px-4 py-3 font-mono text-[13px] leading-6 text-black outline-none"
            placeholder="SELECT * FROM TB_STUDENT_PROFILE LIMIT 20"
            spellCheck={false}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted">예시: SELECT * FROM TB_STUDENT_PROFILE LIMIT 20</div>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={runningQuery}
              onClick={() => void runQuery(sql, maxRows)}
            >
              {runningQuery ? "실행 중..." : "쿼리 실행"}
            </button>
          </div>

          {errorMessage ? <div className="mt-3 text-sm text-[#b42318]">{errorMessage}</div> : null}
        </section>

        <section className="rounded-[22px] border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black">결과</div>
              <div className="mt-1 text-xs text-muted">
                {result?.ok
                  ? `${result.rowCount ?? 0} rows · ${result.columns?.length ?? 0} columns · ${result.elapsedMs ?? 0} ms`
                  : "아직 실행된 결과가 없습니다."}
              </div>
            </div>
            {result?.truncated ? (
              <div className="rounded-full bg-safe px-3 py-1 text-xs text-black">
                {result.maxRows}행까지만 표시
              </div>
            ) : null}
          </div>

          {result?.ok && result.columns && result.columns.length > 0 ? (
            <div className="overflow-auto rounded-2xl border border-line">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column} className="border-b border-line px-3 py-2 font-semibold text-black">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows && result.rows.length > 0 ? (
                    result.rows.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${result.columns?.join("-")}`} className="align-top">
                        {result.columns?.map((column) => (
                          <td key={`${rowIndex}-${column}`} className="border-b border-line px-3 py-2 font-mono text-[12px]">
                            {formatCell(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={result.columns.length} className="px-3 py-6 text-center text-sm text-muted">
                        조회 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              테이블을 선택하거나 SQL을 입력한 뒤 실행해 주세요.
            </div>
          )}
        </section>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
