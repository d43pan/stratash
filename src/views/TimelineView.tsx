import { TimelineChart } from "../components/charts/TimelineChart";
import { NoTimestampState } from "../components/charts/NoTimestampState";
import type { HistoryStats } from "../types/history";

interface TimelineViewProps {
  stats: HistoryStats;
}

export function TimelineView({ stats }: TimelineViewProps) {
  if (!stats.hasTimestamps) {
    return <NoTimestampState />;
  }
  return (
    <div className="h-full w-full">
      <TimelineChart
        daily={stats.timelineDaily}
        weekly={stats.timelineWeekly}
      />
    </div>
  );
}
