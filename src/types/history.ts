export interface HistoryEntry {
  index: number;
  timestamp: string | null; // ISO 8601 string or null
  command: string;
  argv0: string;
}

export interface HistoryMeta {
  sourcePath: string;
  totalCount: number;
  hasTimestamps: boolean;
}

export interface CommandCount {
  command: string;
  count: number;
}

export interface DailyActivity {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface HistoryStats {
  topCommands: CommandCount[];
  dailyActivity: DailyActivity[];
  hourDayGrid: number[][]; // [hour][weekday]
  timelineDaily: TimelinePoint[];
  timelineWeekly: TimelinePoint[];
  hasTimestamps: boolean;
}

export interface EntriesPage {
  entries: HistoryEntry[];
  totalFiltered: number;
  offset: number;
}

export type ViewName = "top-commands" | "heatmap" | "timeline" | "browser";

export interface CommandDocs {
  source: string;
  fullText: string;
  flagDescriptions: Record<string, string>;
}

export interface CommandDetail {
  argv0: string;
  totalCount: number;
  topFlags: CommandCount[];
  topSubcommands: CommandCount[];
  topPipes: CommandCount[];
  topRedirects: CommandCount[];
  topInvocations: CommandCount[];
  usageTimeline: TimelinePoint[];
  hasTimestamps: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
}
