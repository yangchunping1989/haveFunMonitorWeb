<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import { label, dateText } from "./metrics";
const props = defineProps<{ data: any }>(),
  step = ref(0),
  playing = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
const events = computed(() => props.data.events || []),
  match = computed(() => props.data.match),
  state = computed(() =>
    step.value === 0
      ? match.value.initial_state
      : events.value[step.value - 1]?.after_state || match.value.final_state,
  ),
  event = computed(() => events.value[step.value - 1]);
const skillName = (id: string) =>
  match.value.catalog?.find((s: any) => s.id === id)?.name || id;
function stop() {
  clearInterval(timer);
  playing.value = false;
}
function toggle() {
  if (playing.value) {
    stop();
    return;
  }
  if (step.value >= events.value.length) step.value = 0;
  playing.value = true;
  timer = setInterval(() => {
    if (step.value < events.value.length) step.value++;
    else stop();
  }, 1000);
}
onUnmounted(stop);
</script>
<template>
  <div class="replay">
    <div class="replay-meta">
      <el-tag>{{ label(match.completeness) }}回放</el-tag
      ><span>{{ label(match.source) }} · 规则 {{ match.rule_version }}</span>
      <p>
        猜枚：{{
          match.initial_state.guessParity == null
            ? "未记录"
            : match.initial_state.guestGuessedCorrectly
              ? "对方猜中执黑"
              : "房主执黑"
        }}
      </p>
      <p>黑方：{{ match.black_skills.map(skillName).join("、") }}</p>
      <p>白方：{{ match.white_skills.map(skillName).join("、") }}</p>
    </div>
    <el-alert
      v-if="match.completeness === 'MIXED'"
      title="此局跨规则版本，回放保留真实局面，不参与技能强度统计。"
      type="warning"
      :closable="false"
    /><svg
      viewBox="0 0 480 480"
      class="board"
      role="img"
      aria-label="五子棋对局回放"
    >
      <rect width="480" height="480" rx="8" fill="#ead7b5" />
      <g stroke="#9e8869" stroke-width="1">
        <template v-for="i in 15" :key="i">
          <line
            :x1="30 + (i - 1) * 30"
            y1="30"
            :x2="30 + (i - 1) * 30"
            y2="450"
          />
          <line
            x1="30"
            :y1="30 + (i - 1) * 30"
            x2="450"
            :y2="30 + (i - 1) * 30"
          />
        </template>
      </g>
      <g v-for="c in state.board" :key="c.index">
        <circle
          v-if="c.owner"
          :cx="30 + c.col * 30"
          :cy="30 + c.row * 30"
          r="12"
          :fill="c.owner === 'black' ? '#25312e' : '#fffdf7'"
          :opacity="c.virtual ? 0.45 : 1"
          :stroke="c.virtual ? '#74654f' : '#6b6255'"
          :stroke-dasharray="c.virtual ? '3 2' : undefined"
        />
        <circle
          v-if="c.guardedUntil"
          :cx="30 + c.col * 30"
          :cy="30 + c.row * 30"
          r="14"
          fill="none"
          stroke="#2d92bc"
          stroke-width="2"
        />
        <text
          v-if="c.lockedUntil || c.mutedUntil"
          :x="30 + c.col * 30"
          :y="35 + c.row * 30"
          text-anchor="middle"
          fill="#b24f41"
          font-size="17"
        >
          ×
        </text>
      </g>
      <circle
        v-if="event?.target != null"
        :cx="30 + (event.target % 15) * 30"
        :cy="30 + Math.floor(event.target / 15) * 30"
        r="4"
        fill="#e79f36"
      />
    </svg>
    <div class="replay-controls">
      <el-button @click="toggle">{{ playing ? "暂停" : "播放" }}</el-button
      ><el-button
        :disabled="step === 0"
        @click="
          stop();
          step--;
        "
        >上一步</el-button
      ><el-button
        :disabled="step >= events.length"
        @click="
          stop();
          step++;
        "
        >下一步</el-button
      ><span>{{ step }} / {{ events.length }}</span>
    </div>
    <el-slider
      v-model="step"
      :min="0"
      :max="Math.max(1, events.length)"
      :disabled="!events.length"
      @change="stop"
    />
    <p v-if="event">
      {{ dateText(event.created_at) }} · {{ label(event.actor) }}
      {{ label(event.type) }}
      {{ event.skill_id ? skillName(event.skill_id) : "" }}
    </p>
    <p v-else>初始记录局面</p>
    <el-alert
      v-if="match.completeness === 'PARTIAL'"
      title="这局在记录功能接入前已开始，仅能回放接入后的部分。"
      type="warning"
      :closable="false"
    />
  </div>
</template>
