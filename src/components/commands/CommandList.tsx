import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CommandCount } from "../../types/history";

const ROW_HEIGHT = 40;

interface CommandListProps {
  commands: CommandCount[];
  onCommandClick: (cmd: string) => void;
}

export function CommandList({ commands, onCommandClick }: CommandListProps) {
  const [query, setQuery] = useState("");
  const [regexError, setRegexError] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) {
      setRegexError(false);
      return commands;
    }
    try {
      const re = new RegExp(query, "i");
      setRegexError(false);
      return commands.filter((c) => re.test(c.command));
    } catch {
      setRegexError(true);
      const lower = query.toLowerCase();
      return commands.filter((c) => c.command.toLowerCase().includes(lower));
    }
  }, [commands, query]);

  const maxCount = filtered[0]?.count ?? 1;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider shrink-0">
          All Commands
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Regex search  (e.g. ^git, ls|cd)"
          className={`flex-1 bg-slate-800 border rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 ${
            regexError ? "border-red-500" : "border-slate-600"
          }`}
        />
        <span className="text-slate-500 text-xs shrink-0">
          {filtered.length.toLocaleString()} commands
        </span>
      </div>

      <div className="text-slate-600 text-xs mb-2 px-2">
        Click a command to see details
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vrow) => {
            const row = filtered[vrow.index];
            const barWidth = Math.round((row.count / maxCount) * 180);
            return (
              <div
                key={vrow.key}
                onClick={() => onCommandClick(row.command)}
                style={{
                  position: "absolute",
                  top: vrow.start,
                  height: ROW_HEIGHT,
                  width: "100%",
                }}
                className="flex items-center gap-3 px-2 hover:bg-slate-800 cursor-pointer rounded"
              >
                <span className="text-slate-600 text-xs w-10 text-right shrink-0">
                  {vrow.index + 1}
                </span>
                <span className="font-mono text-slate-200 text-sm w-40 truncate shrink-0">
                  {row.command}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="h-2 rounded-sm bg-blue-500/70 shrink-0"
                    style={{ width: barWidth }}
                  />
                  <span className="text-slate-400 text-xs">
                    {row.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
