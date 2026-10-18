export let csrfToken = "";
export function setCsrf(value: string) {
  csrfToken = value;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api(path: string, method = "GET", body?: unknown) {
  const headers: Record<string, string> = { "X-Admin-Request": "1" };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = csrfToken;
  }
  const response = await fetch(`/api/admin/v1${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ message: "服务返回格式异常" }));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("admin-unauthorized"));
    throw new ApiError(data.message || "请求失败", response.status);
  }
  return data;
}
export function query(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return "?" + q.toString();
}
