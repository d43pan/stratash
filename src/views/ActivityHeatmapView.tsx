import { ActivityHeatmap } from "../components/charts/ActivityHeatmap";
import { NoTimestampState } from "../components/charts/NoTimestampState";
import type { HistoryStats } from "../types/history";

interface ActivityHeatmapViewProps {
  stats: HistoryStats;
}

export function ActivityHeatmapView({ stats }: ActivityHeatmapViewProps) {
  if (!stats.hasTimestamps) {
    return <NoTimestampState />;
  }
  return (
    <div className="h-full w-full">
      <ActivityHeatmap data={stats.dailyActivity} />
    </div>
  );
}
