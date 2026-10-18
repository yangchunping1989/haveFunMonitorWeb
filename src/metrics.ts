export function percent(n: number, d: number) {
  return d > 0 ? `${((100 * n) / d).toFixed(1)}%` : "—";
}
export function wilson(wins: number, total: number) {
  if (total <= 0) return "暂无胜负样本";
  const z = 1.96,
    p = wins / total,
    k = 1 + (z * z) / total,
    mid = (p + (z * z) / (2 * total)) / k,
    half =
      (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
      k;
  return `${(100 * Math.max(0, mid - half)).toFixed(1)}%–${(100 * Math.min(1, mid + half)).toFixed(1)}%`;
}
export function dateText(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false,
      });
}
export function localDay(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(
    d,
  );
}
export const labels: Record<string, string> = {
  WordRatingScheduler: "词语评分更新",
  UndercoverRatingScheduler: "卧底词对更新",
  CategoryPromotionScheduler: "候选分类晋升",
  SourceQualityScheduler: "来源质量评估",
  WerewolfRoomCleanupScheduler: "狼人杀房间清理",
  SUCCESS: "成功",
  RUNNING: "运行中",
  FAILED: "失败",
  INTERRUPTED: "执行异常",
  SKIPPED: "其他实例正在执行",
  PENDING: "待处理",
  PROCESSING: "处理中",
  RESOLVED: "已处理",
  DECLINED: "暂不处理",
  ACTIVE: "正式",
  CANDIDATE: "候选",
  DISABLED: "停用",
  SCHEDULED: "任务计算",
  BASELINE: "首次基线",
  OBSERVED_INTERVAL: "区间观测（可能含实时变化）",
  LIVE: "正式使用",
  TEST: "测试",
  SIMULATION: "自动模拟",
  UNKNOWN: "来源未标记",
  FULL: "完整",
  PARTIAL: "部分记录",
  black: "黑方",
  white: "白方",
  DRAW: "平局",
  MOVE: "落子",
  SKILL: "发动技能",
  COUNTER: "反制",
  DECLINE_COUNTER: "放弃反制",
  COUNTER_TIMEOUT: "反制超时结算",
};
export function label(value: unknown) {
  return labels[String(value)] || String(value ?? "—");
}
Object.assign(labels, {
  AdminMaintenance: "权重观测与记录维护",
  MIXED: "混合规则版本",
  UP: "好评",
  DOWN: "差评",
  TOO_OBSCURE: "太生僻",
  HARD_TO_DESCRIBE: "难以描述",
  AMBIGUOUS: "含义模糊",
  NOT_SOCIAL: "不适合聚会",
  WRONG_CATEGORY: "分类不合适",
});
export function changeEvidence(row: any) {
  if (!row.before_state) return "首次采集的状态，不代表涨跌";
  const before = row.before_state,
    after = row.after_state,
    parts: string[] = [];
  for (const [key, title] of [
    ["up", "好评"],
    ["down", "差评"],
    ["shown", "曝光"],
    ["correct", "猜对"],
    ["skipped", "跳过"],
    ["completed", "完局"],
  ]) {
    const diff = Number(after[key] ?? 0) - Number(before[key] ?? 0);
    if (diff) parts.push(`${title}${diff > 0 ? "+" : ""}${diff}`);
  }
  if (before.status !== after.status)
    parts.push(`${label(before.status)} → ${label(after.status)}`);
  if (before.globalWeight !== after.globalWeight) parts.push("全局权重变化");
  if (before.ruleVersion !== after.ruleVersion) parts.push("计算规则版本变化");
  return parts.join("；") || "其他计算输入或状态变化，展开查看";
}
