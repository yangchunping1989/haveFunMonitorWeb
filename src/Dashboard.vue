<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { api, query } from "./api";
import {
  percent,
  wilson,
  dateText,
  label,
  localDay,
  changeEvidence,
} from "./metrics";
import TrendChart from "./TrendChart.vue";
import MatchReplay from "./MatchReplay.vue";
const route = useRoute(),
  section = computed(() => String(route.params.section || "overview"));
const titles: Record<string, string> = {
  overview: "运营概览",
  analytics: "使用分析",
  suggestions: "用户建议",
  feedback: "词条反馈",
  words: "词库观察",
  jobs: "自动任务",
  gomoku: "五子棋对战",
  skills: "技能分析",
  loadouts: "配装与对手",
};
const descriptions: Record<string, string> = {
  overview: "从使用、反馈与自动任务，了解小程序的近况。",
  analytics: "按真实记录观察使用趋势，每个指标都有明确口径。",
  suggestions: "阅读玩家的想法，记录处理进展。",
  feedback: "查看词条评价的原始操作记录；有效票数请在词库观察查看。",
  words: "追踪词条的权重、状态和变化证据。",
  jobs: "查看每次执行结果，以及它影响了哪些内容。",
  gomoku: "保留每一局的配装、行动与结果，为调整规则积累证据。",
  skills: "结合颜色、版本与样本量观察技能表现。",
  loadouts: "比较不同配装对战的实际结果，保留未决样本。",
};
const dates = ref<[string, string]>([localDay(-6), localDay()]),
  q = ref(""),
  kind = ref("word"),
  status = ref(""),
  source = ref(""),
  version = ref(""),
  job = ref(""),
  direction = ref(""),
  page = ref(1);
const wordMode = ref("current");
const busy = ref(false),
  error = ref(""),
  data = ref<any>({ items: [], total: 0 }),
  trend = ref<any[]>([]),
  jobs = ref<any[]>([]),
  updated = ref("");
const drawer = ref(false),
  drawerTitle = ref(""),
  detail = ref<any>(null),
  detailError = ref(""),
  detailBusy = ref(false),
  note = ref(""),
  reviewStatus = ref("PENDING"),
  saving = ref(false);
const historyPage = ref(1),
  historyTotal = ref(0),
  historyRows = ref<any[]>([]),
  historyTarget = ref<any>(null);
let generation = 0,
  detailGeneration = 0;
const list = computed<any[]>(() =>
  Array.isArray(data.value) ? data.value : data.value.items || [],
);
const params = () => ({
  from: dates.value?.[0],
  to: dates.value?.[1],
  q: q.value,
  type: kind.value,
  status: status.value,
  source: source.value,
  version: version.value,
  job: job.value,
  direction: direction.value,
  page: page.value,
  size: 20,
});
async function load() {
  const mine = ++generation;
  busy.value = true;
  error.value = "";
  const s = section.value,
    p = params();
  try {
    let result: any;
    if (s === "overview") {
      const [a, b] = await Promise.all([
        api("/overview" + query(p)),
        api("/analytics" + query(p)),
      ]);
      if (mine !== generation) return;
      result = a;
      trend.value = b;
    } else if (s === "analytics") result = await api("/analytics" + query(p));
    else if (s === "jobs") {
      const [a, b] = await Promise.all([
        api("/jobs"),
        api("/job-runs" + query(p)),
      ]);
      if (mine !== generation) return;
      jobs.value = a;
      result = b;
    } else
      result = await api(
        ({
          suggestions: "/suggestions",
          feedback: "/word-feedback",
          words: wordMode.value === "changes" ? "/rating-changes" : "/words",
          gomoku: "/gomoku/matches",
          skills: "/gomoku/skills",
          loadouts: "/gomoku/loadouts",
        }[s] || "/overview") +
          query({
            ...p,
            source:
              s === "skills" || s === "loadouts"
                ? source.value || "LIVE"
                : source.value,
          }),
      );
    if (mine === generation) {
      data.value = result;
      updated.value = new Date().toISOString();
    }
  } catch (e) {
    if (mine === generation) error.value = (e as Error).message;
  } finally {
    if (mine === generation) busy.value = false;
  }
}
function search() {
  page.value = 1;
  load();
}
function quick(days: number) {
  dates.value = [localDay(1 - days), localDay()];
  search();
}
function reset() {
  q.value = "";
  kind.value = "word";
  status.value = "";
  job.value = "";
  direction.value = "";
  version.value = "";
  source.value = "";
  page.value = 1;
  drawer.value = false;
  load();
}
watch(section, reset, { immediate: true });
onUnmounted(() => {
  generation++;
  detailGeneration++;
});
const metricCards = [
  ["app_logged_users", "登录活跃账号", "按访问上报账号去重"],
  ["app_installations", "活跃安装", "按访问安装标识去重"],
  ["undercover_games", "卧底完局", "已上报的有效完局"],
  ["werewolf_games", "狼人杀开局", "接入后的后端事件"],
  ["gomoku_games", "五子棋开局", "正式及未知来源"],
  ["suggestions", "用户建议", "收到的文字建议"],
  ["failed_jobs", "任务异常", "失败及执行异常"],
  ["rating_changes", "词库变化记录", "不含首次基线"],
];
const colors: Record<string, string> = {
  SUCCESS: "success",
  RESOLVED: "success",
  FAILED: "danger",
  INTERRUPTED: "danger",
  PROCESSING: "warning",
  RUNNING: "warning",
  DISABLED: "danger",
};
function tagType(value: string) {
  return (colors[value] || "info") as any;
}
function summary(value: any): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return label(value);
}
function cards(row: any, key: string) {
  return (row[key] || [])
    .map((id: string) => row.catalog?.find((s: any) => s.id === id)?.name || id)
    .join(" / ");
}
function showSuggestion(row: any) {
  detailGeneration++;
  drawerTitle.value = "建议详情";
  detail.value = { suggestion: row };
  note.value = row.note;
  reviewStatus.value = row.status;
  detailError.value = "";
  drawer.value = true;
}
async function saveReview() {
  saving.value = true;
  try {
    await api(`/suggestions/${detail.value.suggestion.id}/review`, "PUT", {
      status: reviewStatus.value,
      note: note.value,
    });
    ElMessage.success("处理记录已保存");
    drawer.value = false;
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    saving.value = false;
  }
}
async function showMatch(row: any) {
  const mine = ++detailGeneration;
  drawerTitle.value = "对局回放";
  detail.value = null;
  detailError.value = "";
  drawer.value = true;
  detailBusy.value = true;
  try {
    const value = await api("/gomoku/matches/" + row.id);
    if (mine === detailGeneration) detail.value = value;
  } catch (e) {
    if (mine === detailGeneration) detailError.value = (e as Error).message;
  } finally {
    if (mine === detailGeneration) detailBusy.value = false;
  }
}
async function showHistory(row: any, type = kind.value) {
  historyTarget.value = { ...row, type };
  historyPage.value = 1;
  drawerTitle.value = `${row.label || row.word || row.skill || "词条"} · 变化记录`;
  detail.value = { history: true };
  drawer.value = true;
  await loadHistory();
}
async function loadHistory() {
  const mine = ++detailGeneration;
  detailBusy.value = true;
  detailError.value = "";
  try {
    const r = await api(
      "/rating-changes" +
        query({
          ...params(),
          type: historyTarget.value.type,
          objectId: historyTarget.value.id || historyTarget.value.object_id,
          runId: historyTarget.value.runId,
          page: historyPage.value,
        }),
    );
    if (mine === detailGeneration) {
      historyRows.value = r.items;
      historyTotal.value = r.total;
    }
  } catch (e) {
    if (mine === detailGeneration) detailError.value = (e as Error).message;
  } finally {
    if (mine === detailGeneration) detailBusy.value = false;
  }
}
function showRun(row: any) {
  detailGeneration++;
  drawerTitle.value = "任务执行详情";
  detail.value = { run: row };
  detailError.value = "";
  drawer.value = true;
}
async function openRun(id: string) {
  const mine = ++detailGeneration;
  detail.value = null;
  drawerTitle.value = "任务执行详情";
  drawer.value = true;
  detailBusy.value = true;
  detailError.value = "";
  try {
    const run = await api("/job-runs/" + id);
    if (mine === detailGeneration) detail.value = { run };
  } catch (e) {
    if (mine === detailGeneration) detailError.value = (e as Error).message;
  } finally {
    if (mine === detailGeneration) detailBusy.value = false;
  }
}
function runChanges(row: any) {
  showHistory({ label: label(row.job), runId: row.id }, "");
}
const historyTrend = computed(() =>
  historyRows.value
    .filter((r) => r.after_state?.weight != null)
    .slice()
    .reverse()
    .map((r) => ({
      day: dateText(r.created_at),
      metric: "权重（当前页）",
      value: r.after_state.weight,
    })),
);
const skillColumns = [
  ["name", "技能"],
  ["level", "等级"],
  ["rule_version", "规则版本"],
  ["side", "执子"],
  ["carried", "携带席位"],
  ["decided", "胜负样本"],
];
</script>
<template>
  <main class="page">
    <div class="page-heading">
      <div>
        <span class="eyebrow">OPERATIONS / {{ section.toUpperCase() }}</span>
        <h1>{{ titles[section] }}</h1>
        <p>{{ descriptions[section] }}</p>
      </div>
      <el-button :loading="busy" @click="load">↻ 刷新数据</el-button>
    </div>
    <div class="filters">
      <el-date-picker
        v-model="dates"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :clearable="false"
        @change="search"
      /><el-button-group
        ><el-button @click="quick(1)">今天</el-button
        ><el-button @click="quick(7)">近7天</el-button
        ><el-button @click="quick(30)">近30天</el-button></el-button-group
      ><span class="filter-time"
        >北京时间 · {{ updated ? dateText(updated) : "尚未加载" }}</span
      >
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
      class="space"
    />
    <div v-if="section === 'overview'" v-loading="busy">
      <div class="metric-grid">
        <div
          v-for="[key, title, hint] in metricCards"
          :key="key"
          class="metric-card"
        >
          <span>{{ title }}</span
          ><strong>{{ data.metrics?.[key] ?? "—" }}</strong
          ><small>{{ hint }}</small>
        </div>
      </div>
      <section class="panel">
        <div class="panel-heading">
          <h2>使用记录趋势</h2>
          <router-link to="/analytics">查看分析 →</router-link>
        </div>
        <TrendChart v-if="trend.length" :rows="trend" /><el-empty
          v-else
          description="所选时间暂无使用记录"
        />
      </section>
      <el-alert
        :title="data.coverage || '数据加载中'"
        type="info"
        :closable="false"
      />
      <div class="quick-grid">
        <router-link to="/suggestions"
          ><h3>阅读用户建议 →</h3>
          <p>查看文字反馈，记录处理进展。</p></router-link
        ><router-link to="/jobs"
          ><h3>检查自动任务 →</h3>
          <p>查看执行结果和词库变更证据。</p></router-link
        ><router-link to="/gomoku"
          ><h3>查看五子棋对战 →</h3>
          <p>回放技能出手与反制过程。</p></router-link
        >
      </div>
    </div>
    <section v-else-if="section === 'analytics'" class="panel" v-loading="busy">
      <h2>按日使用情况</h2>
      <el-alert
        title="词语结果次数不等于局数。卧底统计已上报完局；五子棋从记录接入后统计。狼人杀按接入后的后端开局与完局事件统计。缺少记录的日期不补造零值。"
        type="info"
        :closable="false"
      /><TrendChart v-if="list.length" :rows="list" /><el-empty
        v-else
        description="所选时间暂无记录"
      /><el-table :data="list"
        ><el-table-column prop="day" label="日期" /><el-table-column
          prop="metric"
          label="指标" /><el-table-column prop="value" label="数量"
      /></el-table>
    </section>
    <template v-else
      ><div class="table-filters">
        <el-input
          v-if="
            ['suggestions', 'feedback', 'words', 'gomoku'].includes(section)
          "
          v-model="q"
          :placeholder="section === 'gomoku' ? '搜索房间号' : '搜索内容或词条'"
          clearable
          @keyup.enter="search"
        /><el-select
          v-if="['feedback', 'words'].includes(section)"
          v-model="kind"
          @change="search"
          ><el-option label="你画我猜词条" value="word" /><el-option
            label="谁是卧底词对"
            value="pair" /></el-select
        ><el-select
          v-if="section === 'suggestions'"
          v-model="status"
          clearable
          placeholder="全部处理状态"
          @change="search"
          ><el-option
            v-for="s in ['PENDING', 'PROCESSING', 'RESOLVED', 'DECLINED']"
            :key="s"
            :label="label(s)"
            :value="s" /></el-select
        ><el-select
          v-if="section === 'words'"
          v-model="status"
          clearable
          placeholder="全部词条状态"
          @change="search"
          ><el-option
            v-for="s in ['ACTIVE', 'CANDIDATE', 'DISABLED']"
            :key="s"
            :label="label(s)"
            :value="s" /></el-select
        ><template v-if="['gomoku', 'skills', 'loadouts'].includes(section)"
          ><el-select
            v-model="source"
            clearable
            :placeholder="
              section === 'gomoku' ? '全部来源' : '正式使用（默认）'
            "
            @change="search"
            ><el-option
              v-for="s in ['LIVE', 'UNKNOWN', 'TEST', 'SIMULATION']"
              :key="s"
              :label="label(s)"
              :value="s" /></el-select
          ><el-input
            v-if="section !== 'loadouts'"
            v-model="version"
            placeholder="筛选规则版本"
            clearable
            @keyup.enter="search" /></template
        ><el-button v-if="section !== 'jobs'" type="primary" @click="search"
          >查询</el-button
        >
      </div>
      <template v-if="section === 'jobs'"
        ><div class="job-grid">
          <button
            v-for="item in jobs"
            :key="item.job"
            :class="['job-card', { selected: job === item.job }]"
            @click="
              job = job === item.job ? '' : item.job;
              search();
            "
          >
            <span>{{ label(item.job) }}</span
            ><el-tag :type="tagType(item.latest[0]?.status)">{{
              !item.enabled
                ? "已禁用"
                : item.latest[0]
                  ? label(item.latest[0].status)
                  : "尚无执行记录"
            }}</el-tag
            ><small>{{ item.schedule }} · {{ item.zone }}</small
            ><small
              >最近成功：{{
                dateText(item.last_success[0]?.finished_at)
              }}</small
            ><small v-if="item.next_planned_at"
              >下次计划：{{ dateText(item.next_planned_at) }}</small
            >
          </button>
        </div>
        <el-alert
          title="首次接入前的执行历史不可追溯。成功且变更数为0表示执行成功但无词库变更；房间清理结果在执行详情查看。"
          type="info"
          :closable="false"
          class="space"
      /></template>
      <div v-if="section === 'words'" class="table-filters">
        <el-radio-group v-model="wordMode" @change="search"
          ><el-radio-button value="current">当前词库</el-radio-button
          ><el-radio-button value="changes"
            >变化记录</el-radio-button
          ></el-radio-group
        ><el-select
          v-if="wordMode === 'changes'"
          v-model="direction"
          clearable
          placeholder="全部变化"
          @change="search"
          ><el-option label="权重上升" value="up" /><el-option
            label="权重下降"
            value="down"
        /></el-select>
      </div>
      <el-alert
        v-if="section === 'words'"
        :title="
          kind === 'word'
            ? '当前权重由分类70%与全局30%组合；不是抽中概率。日期范围用于变化历史，当前值不随日期变化。'
            : '卧底动态权重同时受好差评和曝光次数影响；下降不一定是差评。日期范围用于变化历史。'
        "
        type="info"
        :closable="false"
        class="space" />
      <el-alert
        v-if="section === 'skills' || section === 'loadouts'"
        title="按规则版本和黑白方分组，默认只看正式使用且记录完整的对局。部分记录、混合规则不参与；同技能镜像和重复玩家组合单列观察。胜率仅计正常胜负，未决单列；使用后胜率有出手时机偏差，不能当作技能带来的净收益。配装对战差异只是观察证据，不代表已证明克制。"
        type="warning"
        :closable="false"
        class="space" />
      <section class="panel table-panel" v-loading="busy">
        <el-table :data="list" stripe empty-text="所选条件暂无记录">
          <template v-if="section === 'suggestions'"
            ><el-table-column label="提交时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.created_at)
              }}</template></el-table-column
            ><el-table-column
              prop="user_label"
              label="用户标识"
              width="120"
            /><el-table-column
              prop="content"
              label="建议内容"
              min-width="280"
              show-overflow-tooltip
            /><el-table-column label="状态" width="110"
              ><template #default="{ row }"
                ><el-tag :type="tagType(row.status)">{{
                  label(row.status)
                }}</el-tag></template
              ></el-table-column
            ><el-table-column label="操作" width="110"
              ><template #default="{ row }"
                ><el-button link type="primary" @click="showSuggestion(row)"
                  >查看与处理</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'feedback'"
            ><el-table-column label="收到时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.created_at)
              }}</template></el-table-column
            ><el-table-column
              prop="word"
              label="词条 / 词对"
              min-width="180"
            /><el-table-column prop="category" label="分类" /><el-table-column
              label="评价"
              ><template #default="{ row }">{{
                label(row.vote)
              }}</template></el-table-column
            ><el-table-column label="原因"
              ><template #default="{ row }">{{
                label(row.down_reason)
              }}</template></el-table-column
            ><el-table-column label="操作"
              ><template #default="{ row }"
                ><el-button
                  v-if="row.object_id"
                  link
                  type="primary"
                  @click="
                    showHistory({ ...row, id: row.object_id }, row.object_type)
                  "
                  >变化记录</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'words' && wordMode === 'current'"
            ><el-table-column
              prop="label"
              label="词条 / 词对"
              min-width="170"
            /><el-table-column prop="category" label="分类" /><el-table-column
              label="状态"
              ><template #default="{ row }">{{
                label(row.status)
              }}</template></el-table-column
            ><el-table-column label="当前权重"
              ><template #default="{ row }">{{
                Number(row.weight).toFixed(4)
              }}</template></el-table-column
            ><el-table-column prop="shown" label="累计曝光" /><el-table-column
              prop="up"
              label="已计分好评"
            /><el-table-column prop="down" label="已计分差评" /><el-table-column
              label="操作"
              width="120"
              ><template #default="{ row }"
                ><el-button link type="primary" @click="showHistory(row)"
                  >查看变化</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'words' && wordMode === 'changes'"
            ><el-table-column
              prop="label"
              label="词条 / 词对"
              min-width="170"
            /><el-table-column label="时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.created_at)
              }}</template></el-table-column
            ><el-table-column label="原权重"
              ><template #default="{ row }">{{
                row.before_state?.weight == null
                  ? "首次基线"
                  : Number(row.before_state.weight).toFixed(4)
              }}</template></el-table-column
            ><el-table-column label="新权重"
              ><template #default="{ row }">{{
                Number(row.after_state?.weight).toFixed(4)
              }}</template></el-table-column
            ><el-table-column label="变化"
              ><template #default="{ row }">{{
                row.before_state == null ? "—" : Number(row.delta).toFixed(4)
              }}</template></el-table-column
            ><el-table-column label="变化证据" min-width="200"
              ><template #default="{ row }">{{
                changeEvidence(row)
              }}</template></el-table-column
            ><el-table-column label="来源" min-width="180"
              ><template #default="{ row }">{{
                label(row.source)
              }}</template></el-table-column
            ><el-table-column label="操作"
              ><template #default="{ row }"
                ><el-button
                  link
                  type="primary"
                  @click="
                    showHistory({ ...row, id: row.object_id }, row.object_type)
                  "
                  >追踪</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'jobs'"
            ><el-table-column label="任务" min-width="160"
              ><template #default="{ row }">{{
                label(row.job)
              }}</template></el-table-column
            ><el-table-column label="开始时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.started_at)
              }}</template></el-table-column
            ><el-table-column label="状态"
              ><template #default="{ row }"
                ><el-tag :type="tagType(row.status)">{{
                  label(row.status)
                }}</el-tag></template
              ></el-table-column
            ><el-table-column label="耗时"
              ><template #default="{ row }">{{
                row.duration_ms == null
                  ? "—"
                  : (Number(row.duration_ms) / 1000).toFixed(2) + "秒"
              }}</template></el-table-column
            ><el-table-column
              prop="changed_count"
              label="变更记录"
            /><el-table-column label="操作" width="170"
              ><template #default="{ row }"
                ><el-button link type="primary" @click="showRun(row)"
                  >详情</el-button
                ><el-button link type="primary" @click="runChanges(row)"
                  >变更明细</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'gomoku'"
            ><el-table-column
              prop="room_code"
              label="房间号"
              width="110"
            /><el-table-column label="开始时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.started_at)
              }}</template></el-table-column
            ><el-table-column label="结果" width="110"
              ><template #default="{ row }">{{
                row.winner
                  ? label(row.winner) + (row.winner === "DRAW" ? "" : "获胜")
                  : "尚无终局记录"
              }}</template></el-table-column
            ><el-table-column label="黑方配装" min-width="220"
              ><template #default="{ row }">{{
                cards(row, "black_skills")
              }}</template></el-table-column
            ><el-table-column label="白方配装" min-width="220"
              ><template #default="{ row }">{{
                cards(row, "white_skills")
              }}</template></el-table-column
            ><el-table-column label="来源"
              ><template #default="{ row }">{{
                label(row.source)
              }}</template></el-table-column
            ><el-table-column
              prop="turn_count"
              label="换手次数"
            /><el-table-column
              prop="rule_version"
              label="规则版本"
              min-width="180"
            /><el-table-column label="操作" fixed="right" width="100"
              ><template #default="{ row }"
                ><el-button link type="primary" @click="showMatch(row)"
                  >回放</el-button
                ></template
              ></el-table-column
            ></template
          >
          <template v-if="section === 'skills'"
            ><el-table-column
              v-for="[key, title] in skillColumns"
              :key="key"
              :label="title"
              :min-width="key === 'rule_version' ? 145 : key === 'name' ? 115 : ['side','level'].includes(key) ? 65 : 85"
              show-overflow-tooltip
              ><template #default="{ row }">{{
                key === "level"
                  ? row.level === "low"
                    ? "低级"
                    : "高级"
                  : label(row[key])
              }}</template></el-table-column
            ><el-table-column label="选择率" width="85"
              ><template #default="{ row }">{{
                percent(Number(row.carried), Number(row.seats))
              }}</template></el-table-column
            ><el-table-column label="携带胜率 / 95%区间" min-width="175"
              ><template #default="{ row }"
                >{{ percent(Number(row.wins), Number(row.decided))
                }}<small class="cell-small">{{
                  wilson(Number(row.wins), Number(row.decided))
                }}</small></template
              ></el-table-column
            ><el-table-column label="完结使用率" width="90"
              ><template #default="{ row }">{{
                percent(Number(row.finished_used), Number(row.finished_carried))
              }}</template></el-table-column
            ><el-table-column label="被反制率" width="90"><template #default="{ row }">{{percent(Number(row.countered),Number(row.launches))}}</template></el-table-column>
            <el-table-column type="expand"><template #default="{row}"><div class="expanded"><el-descriptions :column="3" border><el-descriptions-item v-for="[key,title] in [['used','已使用席位'],['finished_used','完结已使用'],['finished_carried','完结携带'],['wins','正常获胜'],['unfinished','未决'],['draws','平局'],['player_pairs','不同玩家组合'],['mirrored','镜像携带席位'],['launches','主动发动'],['countered','被对手反制'],['resolved','成功生效']]" :key="key" :label="title">{{row[key]}}</el-descriptions-item><el-descriptions-item label="使用后胜率">{{percent(Number(row.used_wins),Number(row.used_decided))}}（{{row.used_wins}} / {{row.used_decided}}）</el-descriptions-item></el-descriptions><p>使用后胜率受出手时机影响；反制牌通过响应发动，不计入主动发动次数。镜像及重复玩家样本不代表独立的强度证据。</p></div></template></el-table-column></template
          >
          <template v-if="section === 'loadouts'"
            ><el-table-column
              prop="rule_version"
              label="规则版本"
              min-width="180" /><el-table-column
              label="黑方配装"
              min-width="230"
              ><template #default="{ row }">{{
                cards(row, "black_skills")
              }}</template></el-table-column
            ><el-table-column label="白方配装" min-width="230"
              ><template #default="{ row }">{{
                cards(row, "white_skills")
              }}</template></el-table-column
            ><el-table-column
              v-for="[key, title] in [
                ['games', '对局数'],
                ['black_wins', '黑胜'],
                ['white_wins', '白胜'],
                ['draws', '平局'],
                ['unfinished', '未决'],
              ]"
              :key="key"
              :prop="key"
              :label="title"
              width="95"
          /></template> </el-table
        ><el-pagination
          v-if="!Array.isArray(data)"
          v-model:current-page="page"
          :page-size="20"
          :total="data.total || 0"
          layout="total, prev, pager, next"
          @current-change="load"
        /></section
    ></template>
    <el-drawer
      v-model="drawer"
      :title="drawerTitle"
      size="min(850px, 96vw)"
      @closed="detailGeneration++"
      ><div v-loading="detailBusy">
        <el-alert
          v-if="detailError"
          :title="detailError"
          type="error"
          :closable="false"
        />
        <template v-if="detail?.suggestion"
          ><div class="detail-meta">
            {{ dateText(detail.suggestion.created_at) }} · 用户
            {{ detail.suggestion.user_label }}
          </div>
          <div class="suggestion-content">{{ detail.suggestion.content }}</div>
          <el-form label-position="top"
            ><el-form-item label="处理状态"
              ><el-select v-model="reviewStatus"
                ><el-option
                  v-for="s in ['PENDING', 'PROCESSING', 'RESOLVED', 'DECLINED']"
                  :key="s"
                  :label="label(s)"
                  :value="s" /></el-select></el-form-item
            ><el-form-item label="内部备注（不会发送给用户）"
              ><el-input
                v-model="note"
                type="textarea"
                :rows="6"
                maxlength="2000"
                show-word-limit /></el-form-item
            ><el-button type="primary" :loading="saving" @click="saveReview"
              >保存处理记录</el-button
            ></el-form
          ></template
        >
        <MatchReplay
          v-if="detail?.match"
          :key="detail.match.id"
          :data="detail"
        />
        <template v-if="detail?.run"
          ><el-descriptions :column="1" border
            ><el-descriptions-item
              v-for="[key, title] in [
                ['job', '任务'],
                ['status', '状态'],
                ['started_at', '开始'],
                ['finished_at', '结束'],
                ['changed_count', '变更数'],
                ['rule_version', '规则版本'],
                ['error', '错误摘要'],
              ]"
              :key="key"
              :label="title"
              >{{
                key.endsWith("_at")
                  ? dateText(detail.run[key])
                  : summary(detail.run[key])
              }}</el-descriptions-item
            ></el-descriptions
          >
          <h3>处理窗口和计数</h3>
          <pre>{{ JSON.stringify(detail.run.detail, null, 2) }}</pre>
          <el-button @click="runChanges(detail.run)"
            >查看本次变更</el-button
          ></template
        >
        <template v-if="detail?.history"
          ><el-alert
            title="首次基线不代表涨跌；区间观测可能包含实时曝光、反馈和任务变化。曲线仅展示当前页，日期范围与主页面一致。"
            type="info"
            :closable="false" /><TrendChart
            v-if="historyTrend.length"
            :rows="historyTrend" /><el-table
            :data="historyRows"
            empty-text="这段时间没有变化记录"
            ><el-table-column label="时间" width="175"
              ><template #default="{ row }">{{
                dateText(row.created_at)
              }}</template></el-table-column
            ><el-table-column prop="label" label="对象" /><el-table-column
              label="权重变化"
              ><template #default="{ row }"
                >{{
                  row.before_state?.weight == null
                    ? "首次基线"
                    : Number(row.before_state.weight).toFixed(4)
                }}
                →
                {{
                  row.after_state?.weight == null
                    ? "—"
                    : Number(row.after_state.weight).toFixed(4)
                }}</template
              ></el-table-column
            ><el-table-column label="来源"
              ><template #default="{ row }">{{
                label(row.source)
              }}</template></el-table-column
            ><el-table-column type="expand"
              ><template #default="{ row }"
                ><div class="expanded">
                  <p>{{ changeEvidence(row) }}</p>
                  <strong>计算输入与状态</strong>
                  <pre>{{
                    JSON.stringify(
                      { before: row.before_state, after: row.after_state },
                      null,
                      2,
                    )
                  }}</pre>
                  <el-button
                    v-if="row.run_id"
                    link
                    type="primary"
                    @click="openRun(row.run_id)"
                    >关联任务 {{ row.run_id }}</el-button
                  >
                </div></template
              ></el-table-column
            ></el-table
          ><el-pagination
            v-model:current-page="historyPage"
            :total="historyTotal"
            :page-size="20"
            layout="total, prev, pager, next"
            @current-change="loadHistory"
        /></template></div
    ></el-drawer>
  </main>
</template>
