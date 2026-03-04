import { invoke } from "@tauri-apps/api/core";
import type {
  CommandDetail,
  CommandDocs,
  EntriesPage,
  HistoryMeta,
  HistoryStats,
} from "../types/history";

export function loadHistory(): Promise<HistoryMeta> {
  return invoke<HistoryMeta>("load_history");
}

export function reloadHistory(): Promise<HistoryMeta> {
  return invoke<HistoryMeta>("reload_history");
}

export function getStats(topN: number): Promise<HistoryStats> {
  return invoke<HistoryStats>("get_stats", { topN });
}

export function getEntries(
  offset: number,
  limit: number,
  search?: string
): Promise<EntriesPage> {
  return invoke<EntriesPage>("get_entries", { offset, limit, search });
}

export function getEntryCount(search?: string): Promise<number> {
  return invoke<number>("get_entry_count", { search });
}

export function getCommandDetail(
  path: string[],
  topN: number
): Promise<CommandDetail> {
  return invoke<CommandDetail>("get_command_detail", { path, topN });
}

export function getCommandDocs(argv0: string): Promise<CommandDocs> {
  return invoke<CommandDocs>("get_command_docs", { argv0 });
}
