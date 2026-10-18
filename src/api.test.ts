import { afterEach, describe, it, expect, vi } from "vitest";
import { api, setCsrf, ApiError } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  setCsrf("");
});
describe("admin request boundary", () => {
  it("sends session cookies and CSRF for writes without localStorage", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    setCsrf("session-csrf");
    await api("/suggestions/id/review", "PUT", { note: "处理" });
    expect(fetch.mock.calls[0][0]).toBe("/api/admin/v1/suggestions/id/review");
    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "session-csrf", "X-Admin-Request": "1" },
    });
  });
  it("clears the UI session on expired authentication", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: "会话过期" }),
        }),
    );
    await expect(api("/overview")).rejects.toBeInstanceOf(ApiError);
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  it("surfaces failure rather than returning fabricated data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ message: "暂时不可用" }),
        }),
    );
    await expect(api("/jobs")).rejects.toThrow("暂时不可用");
  });
});
