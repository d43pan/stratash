import type { HistoryEntry } from "../../types/history";

interface HistoryRowProps {
  index: number;
  entry: HistoryEntry | null;
  isEven: boolean;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

export function HistoryRow({ index, entry, isEven }: HistoryRowProps) {
  if (!entry) {
    return (
      <div
        className={`grid grid-cols-[5rem_11rem_1fr] gap-0 h-full items-center px-2 ${
          isEven ? "bg-slate-900" : "bg-slate-900/50"
        }`}
      >
        <div className="px-2 text-slate-700 text-xs font-mono">{index + 1}</div>
        <div className="px-2 h-3 w-20 bg-slate-800 rounded animate-pulse" />
        <div className="px-2 h-3 w-48 bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-[5rem_11rem_1fr] gap-0 h-full items-center px-2 hover:bg-slate-800/60 group ${
        isEven ? "bg-slate-900" : "bg-slate-900/50"
      }`}
    >
      <div className="px-2 text-slate-600 text-xs font-mono">{entry.index + 1}</div>
      <div className="px-2 text-slate-500 text-xs font-mono truncate">
        {formatTimestamp(entry.timestamp)}
      </div>
      <div className="px-2 text-slate-200 text-xs font-mono truncate" title={entry.command}>
        <span className="text-blue-400">{entry.argv0}</span>
        {entry.command.slice(entry.argv0.length)}
      </div>
    </div>
  );
}
