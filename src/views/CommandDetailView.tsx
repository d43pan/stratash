import { useState, useEffect, useRef } from "react";
import * as echarts from "echarts";
import { getCommandDetail, getCommandDocs } from "../api/tauri";
import type { CommandCount, CommandDetail, CommandDocs, TimelinePoint } from "../types/history";

interface Props {
  path: string[];
  onNavigate: (path: string[]) => void;
}

interface MiniBarProps {
  items: CommandCount[];
  onItemClick?: (cmd: string) => void;
  descriptions?: Record<string, string>;
}

function MiniBar({ items, onItemClick, descriptions }: MiniBarProps) {
  const maxCount = items[0]?.count ?? 1;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const desc = descriptions?.[item.command];
        return (
          <div
            key={item.command}
            className={`grid text-xs${onItemClick ? " cursor-pointer hover:text-blue-300" : ""}`}
            style={{ gridTemplateColumns: "144px 1fr auto" }}
            onClick={() => onItemClick?.(item.command)}
          >
            <span
              className="font-mono text-slate-300 truncate shrink-0"
              title={item.command}
            >
              {item.command}
            </span>
            <div
              className="h-2 rounded-sm bg-blue-500/60 shrink-0 self-center"
              style={{ width: Math.round((item.count / maxCount) * 120) }}
            />
            <span className="text-slate-500">{item.count.toLocaleString()}</span>
            {desc && (
              <span className="col-span-full text-slate-600 text-xs truncate -mt-1 pl-[152px]">
                {desc}
              </span>
            )}
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-slate-600 text-xs italic">None found</p>
      )}
    </div>
  );
}

function MiniTimeline({ daily }: { daily: TimelinePoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || daily.length === 0) return;
    const chart = echarts.init(ref.current, "dark");
    chart.setOption({
      backgroundColor: "transparent",
      grid: { left: 45, right: 15, top: 10, bottom: 35 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#cbd5e1" },
      },
      xAxis: {
        type: "category",
        data: daily.map((p) => p.date),
        axisLabel: { color: "#64748b", fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: "#334155" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: "#1e293b" } },
      },
      series: [
        {
          type: "line",
          data: daily.map((p) => p.count),
          smooth: true,
          lineStyle: { color: "#3b82f6", width: 2 },
          itemStyle: { color: "#3b82f6" },
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(59,130,246,0.4)" },
              { offset: 1, color: "rgba(59,130,246,0.02)" },
            ]),
          },
        },
      ],
    });
    const obs = new ResizeObserver(() => chart.resize());
    obs.observe(ref.current!);
    return () => {
      obs.disconnect();
      chart.dispose();
    };
  }, [daily]);

  return <div ref={ref} style={{ height: 160 }} className="w-full" />;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function CommandDetailView({ path, onNavigate }: Props) {
  const [detail, setDetail] = useState<CommandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<CommandDocs | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDetail(null);
    getCommandDetail(path, 10)
      .then(setDetail)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path.join("\0")]);

  useEffect(() => {
    setDocs(null);
    getCommandDocs(path[0]).then(setDocs).catch(() => {});
  }, [path[0]]);

  return (
    <div className="h-full w-full overflow-auto p-6">
      {/* Breadcrumb header */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => onNavigate([])}
          className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← All commands
        </button>
        {path.map((segment, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-slate-600">&gt;</span>
            {i < path.length - 1 ? (
              <button
                onClick={() => onNavigate(path.slice(0, i + 1))}
                className="font-mono text-blue-400 hover:text-blue-200 text-sm transition-colors"
              >
                {segment}
              </button>
            ) : (
              <span className="font-mono text-slate-100 text-xl font-bold">
                {segment}
              </span>
            )}
          </span>
        ))}
        {detail && (
          <>
            <span className="text-slate-400 text-sm ml-2">
              {detail.totalCount.toLocaleString()} uses
            </span>
            {detail.firstSeen && detail.lastSeen && (
              <span className="text-slate-600 text-xs">
                {detail.firstSeen} → {detail.lastSeen}
              </span>
            )}
          </>
        )}
      </div>

      {loading && (
        <div className="text-slate-500 text-sm">Loading details…</div>
      )}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {detail && (
        <div className="space-y-4">
          {/* 2-column card grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card title="Top Flags">
              <MiniBar items={detail.topFlags} descriptions={docs?.flagDescriptions} />
            </Card>
            <Card title="Top Subcommands">
              <MiniBar
                items={detail.topSubcommands}
                onItemClick={(sub) => onNavigate([...path, sub])}
                descriptions={docs?.flagDescriptions}
              />
            </Card>
            <Card title="Top Pipe Destinations">
              <MiniBar items={detail.topPipes} />
            </Card>
            <Card title="Top Redirects">
              <MiniBar items={detail.topRedirects} />
            </Card>
          </div>

          {/* Usage timeline */}
          {detail.hasTimestamps && detail.usageTimeline.length > 0 && (
            <Card title="Usage Timeline">
              <MiniTimeline daily={detail.usageTimeline} />
            </Card>
          )}

          {/* Most common invocations */}
          <Card title="Most Common Invocations">
            <div className="space-y-2">
              {detail.topInvocations.map((inv) => (
                <div
                  key={inv.command}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span
                    className="font-mono text-slate-300 truncate min-w-0"
                    title={inv.command}
                  >
                    {inv.command}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    × {inv.count.toLocaleString()}
                  </span>
                </div>
              ))}
              {detail.topInvocations.length === 0 && (
                <p className="text-slate-600 text-xs italic">
                  No invocations found
                </p>
              )}
            </div>
          </Card>

          {/* Collapsible man/help reference */}
          {docs && docs.fullText && (
            <Card title={`${docs.source === "man" ? "Man Page" : "Help"} — ${path[0]}`}>
              <details>
                <summary className="text-slate-500 text-xs cursor-pointer select-none hover:text-slate-300">
                  Show ({Math.round(docs.fullText.length / 1024)} KB)
                </summary>
                <pre className="mt-3 text-xs font-mono text-slate-400 overflow-auto max-h-96 whitespace-pre-wrap break-words border-t border-slate-800 pt-3">
                  {docs.fullText}
                </pre>
              </details>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
