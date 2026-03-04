import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import type { TimelinePoint } from "../../types/history";

interface TimelineChartProps {
  daily: TimelinePoint[];
  weekly: TimelinePoint[];
}

type Granularity = "daily" | "weekly";

export function TimelineChart({ daily, weekly }: TimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, "dark");
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    const points = granularity === "daily" ? daily : weekly;
    if (points.length === 0) return;

    const dates = points.map((p) => p.date);
    const counts = points.map((p) => p.count);

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#cbd5e1" },
        axisPointer: { type: "cross", label: { backgroundColor: "#334155" } },
      },
      grid: { left: 60, right: 30, top: 20, bottom: 80 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: "#64748b", rotate: 30, fontSize: 10 },
        axisLine: { lineStyle: { color: "#334155" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#64748b" },
        splitLine: { lineStyle: { color: "#1e293b" } },
      },
      dataZoom: [
        {
          type: "slider",
          bottom: 10,
          height: 20,
          start: Math.max(0, 100 - (120 / Math.max(dates.length, 1)) * 100),
          end: 100,
          textStyle: { color: "#64748b" },
          fillerColor: "rgba(59,130,246,0.15)",
          borderColor: "#334155",
          handleStyle: { color: "#3b82f6" },
        },
        { type: "inside" },
      ],
      series: [
        {
          type: "line",
          data: counts,
          smooth: true,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(59,130,246,0.4)" },
              { offset: 1, color: "rgba(59,130,246,0.02)" },
            ]),
          },
          lineStyle: { color: "#3b82f6", width: 2 },
          itemStyle: { color: "#3b82f6" },
          showSymbol: false,
        },
      ],
    });
  }, [daily, weekly, granularity]);

  return (
    <div className="h-full w-full p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">
          Command Timeline
        </h2>
        <div className="flex rounded-md overflow-hidden border border-slate-700">
          <button
            onClick={() => setGranularity("daily")}
            className={`px-3 py-1 text-xs transition-colors ${
              granularity === "daily"
                ? "bg-blue-600/40 text-blue-300"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setGranularity("weekly")}
            className={`px-3 py-1 text-xs transition-colors ${
              granularity === "weekly"
                ? "bg-blue-600/40 text-blue-300"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Weekly
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}
