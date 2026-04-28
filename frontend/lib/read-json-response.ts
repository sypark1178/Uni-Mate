/** `response.json()`은 본문이 비었거나 HTML일 때 예외를 던질 수 있어, 클라이언트·서버 모두에서 안전하게 파싱한다. */
export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Route Handler에서 잘못된 JSON 본문으로 500이 나지 않도록 */
export async function readRequestJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
