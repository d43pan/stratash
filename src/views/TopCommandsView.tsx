import { CommandList } from "../components/commands/CommandList";
import type { HistoryStats } from "../types/history";

interface TopCommandsViewProps {
  stats: HistoryStats;
  onCommandClick: (cmd: string) => void;
}

export function TopCommandsView({ stats, onCommandClick }: TopCommandsViewProps) {
  return (
    <div className="h-full w-full">
      <CommandList commands={stats.topCommands} onCommandClick={onCommandClick} />
    </div>
  );
}
