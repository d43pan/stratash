import { useCallback, useEffect, useState } from "react";
import { getStats, loadHistory, reloadHistory } from "../api/tauri";
import type { HistoryMeta, HistoryStats } from "../types/history";

interface HistoryDataState {
  meta: HistoryMeta | null;
  stats: HistoryStats | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useHistoryData(): HistoryDataState {
  const [meta, setMeta] = useState<HistoryMeta | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isReload = false) => {
    setLoading(true);
    setError(null);
    try {
      const loadFn = isReload ? reloadHistory : loadHistory;
      const m = await loadFn();
      setMeta(m);
      const s = await getStats(0);
      setStats(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { meta, stats, loading, error, reload };
}
