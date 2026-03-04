import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getEntries, getEntryCount } from "../../api/tauri";
import type { HistoryEntry } from "../../types/history";
import { HistoryRow } from "./HistoryRow";

const ROW_HEIGHT = 36;
const FETCH_WINDOW = 200;

interface HistoryBrowserProps {
  totalCount: number;
}

export function HistoryBrowser({ totalCount }: HistoryBrowserProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [rowCache, setRowCache] = useState<Map<number, HistoryEntry>>(new Map());
  const [fetchingWindows, setFetchingWindows] = useState<Set<number>>(new Set());

  const parentRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // When search changes, reset cache and get new count
  useEffect(() => {
    setRowCache(new Map());
    setFetchingWindows(new Set());
    const q = debouncedSearch || undefined;
    getEntryCount(q)
      .then(setFilteredCount)
      .catch(console.error);
  }, [debouncedSearch]);

  const virtualizer = useVirtualizer({
    count: filteredCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const fetchWindow = useCallback(
    async (windowIndex: number) => {
      if (fetchingWindows.has(windowIndex)) return;
      setFetchingWindows((prev) => new Set([...prev, windowIndex]));

      const offset = windowIndex * FETCH_WINDOW;
      const q = debouncedSearch || undefined;

      try {
        const page = await getEntries(offset, FETCH_WINDOW, q);
        setRowCache((prev) => {
          const next = new Map(prev);
          page.entries.forEach((entry, i) => {
            next.set(offset + i, entry);
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to fetch entries:", err);
      }
    },
    [debouncedSearch, fetchingWindows]
  );

  // Fetch windows for visible items
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;

    const windowsNeeded = new Set<number>();
    for (const item of items) {
      const windowIndex = Math.floor(item.index / FETCH_WINDOW);
      if (!rowCache.has(item.index)) {
        windowsNeeded.add(windowIndex);
      }
    }
    windowsNeeded.forEach((w) => fetchWindow(w));
  }, [virtualizer.getVirtualItems(), rowCache, fetchWindow]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="h-full w-full flex flex-col">
      {/* Search bar */}
      <div className="px-4 py-2 border-b border-slate-700 shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter commands…"
            className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {filteredCount.toLocaleString()} entries{debouncedSearch ? " matching" : ""}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[5rem_11rem_1fr] gap-0 border-b border-slate-700 px-2 shrink-0">
        <div className="py-2 px-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">#</div>
        <div className="py-2 px-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">Timestamp</div>
        <div className="py-2 px-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">Command</div>
      </div>

      {/* Virtual list */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {virtualItems.map((virtualItem) => {
            const entry = rowCache.get(virtualItem.index);
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <HistoryRow
                  index={virtualItem.index}
                  entry={entry ?? null}
                  isEven={virtualItem.index % 2 === 0}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
