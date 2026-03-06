<template>
  <section class="cms__panel">
    <div class="cms__panel-head">
      <div class="cms__title">Analytics</div>
      <div class="cms__sub">Page views, unique visitors, and link clicks.</div>
    </div>

    <!-- Range selector -->
    <div class="flex items-center gap-2 mb-3">
      <button
        v-for="r in ranges"
        :key="r.value"
        type="button"
        class="px-3 py-1 rounded-full text-xs font-bold transition"
        :class="range === r.value
          ? 'bg-[var(--color-ink)] text-[var(--glass)]'
          : 'bg-[var(--glass-2)] text-[var(--color-ink-soft)] hover:bg-[var(--color-border-2)]'"
        @click="range = r.value; loadData()"
      >
        {{ r.label }}
      </button>
      <button
        type="button"
        class="ml-auto p-1.5 rounded-full hover:bg-[var(--color-border-2)] transition"
        :disabled="loading"
        @click="loadData()"
      >
        <i class="pi pi-refresh text-xs" :class="{ 'pi-spin': loading }" />
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="cms__card text-center py-3">
        <div class="text-2xl font-black text-[var(--color-ink)]">{{ totals.pageviews }}</div>
        <div class="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mt-0.5">Page Views</div>
      </div>
      <div class="cms__card text-center py-3">
        <div class="text-2xl font-black text-[var(--color-ink)]">{{ totals.visitors }}</div>
        <div class="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mt-0.5">Visitors</div>
      </div>
      <div class="cms__card text-center py-3">
        <div class="text-2xl font-black text-[var(--color-ink)]">{{ totals.clicks }}</div>
        <div class="text-[10px] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider mt-0.5">Clicks</div>
      </div>
    </div>

    <!-- Chart -->
    <div class="cms__card mb-3" style="padding: 8px 4px 4px">
      <div v-if="loading && !series.dates.length" class="flex items-center justify-center py-12">
        <i class="pi pi-spin pi-spinner text-xl text-[var(--color-ink-soft)]" />
      </div>
      <v-chart
        v-else
        :option="chartOption"
        autoresize
        style="height: 260px; width: 100%"
      />
    </div>

    <!-- Top pages -->
    <div class="cms__card mb-3">
      <div class="text-xs font-extrabold text-[var(--color-ink)] mb-2">Top Pages</div>
      <div v-if="topPages.length === 0" class="text-xs text-[var(--color-ink-soft)]">No data yet</div>
      <div v-for="(p, i) in topPages" :key="i" class="flex items-center justify-between py-1 text-xs">
        <span class="truncate text-[var(--color-ink)] font-medium" style="max-width: 70%">{{ p.page }}</span>
        <span class="text-[var(--color-ink-soft)] font-bold tabular-nums">{{ p.count }}</span>
      </div>
    </div>

    <!-- Top clicks -->
    <div class="cms__card">
      <div class="text-xs font-extrabold text-[var(--color-ink)] mb-2">Top Clicked Links</div>
      <div v-if="topClicks.length === 0" class="text-xs text-[var(--color-ink-soft)]">No data yet</div>
      <div v-for="(c, i) in topClicks" :key="i" class="flex items-center justify-between py-1 text-xs">
        <span class="truncate text-[var(--color-ink)] font-medium" style="max-width: 70%">{{ c.url }}</span>
        <span class="text-[var(--color-ink-soft)] font-bold tabular-nums">{{ c.count }}</span>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mt-2 text-xs text-red-500 font-semibold">{{ error }}</div>
  </section>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { encryptPayload } from "../lib/admin-crypto";
import { getCmsPassword } from "../lib/cms-auth";

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface AnalyticsSeries {
  dates: string[];
  pageviews: number[];
  visitors: number[];
  clicks: number[];
}

export default defineComponent({
  name: "AnalyticsPanel",
  components: { VChart },
  emits: ["reauth"],
  setup(_props, { emit }) {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

    const ranges = [
      { label: "7 days", value: "7d" },
      { label: "30 days", value: "30d" },
      { label: "90 days", value: "90d" },
    ];

    const range = ref("7d");
    const loading = ref(false);
    const error = ref("");

    const series = ref<AnalyticsSeries>({ dates: [], pageviews: [], visitors: [], clicks: [] });
    const topPages = ref<{ page: string; count: number }[]>([]);
    const topClicks = ref<{ url: string; count: number }[]>([]);
    const totals = ref({ pageviews: 0, visitors: 0, clicks: 0 });

    async function loadData() {
      const pw = getCmsPassword();
      if (!pw || !anonKey || !supabaseUrl) {
        emit("reauth");
        return;
      }

      loading.value = true;
      error.value = "";

      try {
        const token = await encryptPayload(
          JSON.stringify({ password: pw, ts: Date.now() }),
          anonKey,
        );

        const res = await fetch(`${supabaseUrl}/functions/v1/analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            "x-admin-token": token,
          },
          body: JSON.stringify({ action: "query", range: range.value }),
        });

        if (res.status === 401) {
          emit("reauth");
          return;
        }

        const json = await res.json();
        if (json.error) {
          error.value = json.error;
          return;
        }

        series.value = json.series;
        topPages.value = json.topPages || [];
        topClicks.value = json.topClicks || [];
        totals.value = json.totals || { pageviews: 0, visitors: 0, clicks: 0 };
      } catch (e: any) {
        error.value = e.message || "Failed to load analytics";
      } finally {
        loading.value = false;
      }
    }

    const chartOption = computed(() => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "rgba(0,0,0,0.08)",
        borderWidth: 1,
        textStyle: { fontSize: 11, color: "#333" },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: {
        top: 12,
        right: 12,
        bottom: 36,
        left: 36,
      },
      xAxis: {
        type: "category",
        data: series.value.dates.map((d) => {
          const dt = new Date(d + "T00:00:00");
          return `${dt.getMonth() + 1}/${dt.getDate()}`;
        }),
        axisLabel: { fontSize: 10, color: "#999" },
        axisLine: { lineStyle: { color: "#e5e5e5" } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { fontSize: 10, color: "#999" },
        splitLine: { lineStyle: { color: "#f0f0f0" } },
      },
      series: [
        {
          name: "Page Views",
          type: "line",
          data: series.value.pageviews,
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { width: 2.5 },
          itemStyle: { color: "#6366f1" },
          areaStyle: { color: "rgba(99,102,241,0.08)" },
        },
        {
          name: "Visitors",
          type: "line",
          data: series.value.visitors,
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { width: 2.5 },
          itemStyle: { color: "#10b981" },
          areaStyle: { color: "rgba(16,185,129,0.08)" },
        },
        {
          name: "Clicks",
          type: "line",
          data: series.value.clicks,
          smooth: true,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { width: 2.5 },
          itemStyle: { color: "#f59e0b" },
          areaStyle: { color: "rgba(245,158,11,0.08)" },
        },
      ],
    }));

    onMounted(() => {
      loadData();
    });

    return {
      ranges,
      range,
      loading,
      error,
      series,
      topPages,
      topClicks,
      totals,
      chartOption,
      loadData,
    };
  },
});
</script>
