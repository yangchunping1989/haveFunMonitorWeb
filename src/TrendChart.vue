<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);
const props = defineProps<{ rows: any[] }>(),
  el = ref<HTMLDivElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver;
function draw() {
  if (!chart) return;
  const days = [...new Set(props.rows.map((r) => r.day))].sort();
  const metrics = [...new Set(props.rows.map((r) => r.metric))];
  chart.setOption(
    {
      color: ["#16836f", "#e8a451", "#6389b5", "#aa80b1", "#9aa668"],
      tooltip: { trigger: "axis" },
      legend: { bottom: 0 },
      grid: { left: 48, right: 20, top: 25, bottom: 65 },
      xAxis: { type: "category", data: days, boundaryGap: false },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#edf0ef" } },
      },
      series: metrics.map((metric) => ({
        name: metric,
        type: "line",
        smooth: false,
        showSymbol: true,
        data: days.map(
          (day) =>
            props.rows.find((r) => r.day === day && r.metric === metric)
              ?.value ?? null,
        ),
      })),
    },
    true,
  );
}
onMounted(() => {
  chart = echarts.init(el.value!);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(el.value!);
  draw();
});
watch(() => props.rows, draw, { deep: true });
onUnmounted(() => {
  observer?.disconnect();
  chart?.dispose();
});
</script>
<template><div ref="el" class="chart"></div></template>
