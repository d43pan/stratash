import { HistoryBrowser } from "../components/browser/HistoryBrowser";
import type { HistoryMeta } from "../types/history";

interface HistoryBrowserViewProps {
  meta: HistoryMeta;
}

export function HistoryBrowserView({ meta }: HistoryBrowserViewProps) {
  return (
    <div className="h-full w-full">
      <HistoryBrowser totalCount={meta.totalCount} />
    </div>
  );
}
