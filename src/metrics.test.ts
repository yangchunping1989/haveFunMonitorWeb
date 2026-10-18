import { describe, it, expect } from "vitest";
import { percent, wilson, label } from "./metrics";
import { query } from "./api";
describe("balance statistics", () => {
  it("does not invent a win rate with no decided games", () => {
    expect(percent(0, 0)).toBe("—");
    expect(wilson(0, 0)).toBe("暂无胜负样本");
  });
  it("shows uncertainty even for all wins", () => {
    expect(wilson(1, 1)).toBe("20.7%–100.0%");
    expect(wilson(0, 1)).toBe("0.0%–79.3%");
    expect(percent(5, 10)).toBe("50.0%");
  });
  it("escapes search values and preserves pagination", () => {
    const value = query({ q: "'&page=100", page: 1, empty: "", zero: 0 });
    expect(new URLSearchParams(value).get("q")).toBe("'&page=100");
    expect(new URLSearchParams(value).get("page")).toBe("1");
    expect(new URLSearchParams(value).get("zero")).toBe("0");
  });
  it("labels uncertain sources and partial replay", () => {
    expect(label("UNKNOWN")).toBe("来源未标记");
    expect(label("PARTIAL")).toBe("部分记录");
  });
});
