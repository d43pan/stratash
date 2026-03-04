import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { DailyActivity } from "../../types/history";

interface ActivityHeatmapProps {
  data: DailyActivity[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

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
    if (!chartRef.current || data.length === 0) return;

    // Group by year
    const yearMap = new Map<number, [string, number][]>();
    for (const d of data) {
      const year = parseInt(d.date.substring(0, 4));
      if (!yearMap.has(year)) yearMap.set(year, []);
      yearMap.get(year)!.push([d.date, d.count]);
    }

    const years = Array.from(yearMap.keys()).sort();
    const maxCount = Math.max(...data.map((d) => d.count), 1);

    const calendars = years.map((year, i) => ({
      top: 60 + i * 160,
      left: 60,
      right: 30,
      range: String(year),
      cellSize: ["auto", 15],
      itemStyle: { borderWidth: 2, borderColor: "#0f172a" },
      dayLabel: { color: "#475569", nameMap: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] },
      monthLabel: { color: "#64748b" },
      yearLabel: { show: true, color: "#94a3b8" },
    }));

    const series = years.map((year, i) => ({
      type: "heatmap",
      coordinateSystem: "calendar",
      calendarIndex: i,
      data: yearMap.get(year),
    }));

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#cbd5e1" },
        formatter: (params: { data: [string, number] }) => {
          const [date, count] = params.data;
          return `${date}: <b>${count.toLocaleString()}</b> commands`;
        },
      },
      visualMap: {
        min: 0,
        max: maxCount,
        type: "continuous",
        orient: "horizontal",
        left: "center",
        top: 10,
        textStyle: { color: "#64748b" },
        inRange: {
          color: ["#0f172a", "#1e3a5f", "#1d4ed8", "#3b82f6", "#93c5fd"],
        },
      },
      calendar: calendars,
      series: series,
    });
  }, [data]);

  const totalHeight = data.length > 0
    ? (() => {
        const years = new Set(data.map((d) => d.date.substring(0, 4))).size;
        return Math.max(240, 60 + years * 160 + 40);
      })()
    : 300;

  return (
    <div className="h-full w-full overflow-auto p-4">
      <h2 className="text-slate-300 font-semibold mb-3 text-sm uppercase tracking-wider">
        Activity Heatmap
      </h2>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: `${totalHeight}px` }}
      />
    </div>
  );
}
