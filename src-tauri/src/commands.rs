use crate::detail::{compute_command_detail, CommandDetail};
use crate::manpage::{fetch_docs, CommandDocs};
use crate::parser::{parse_history, ParsedHistory};
use crate::stats::{compute_stats, HistoryStats};
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryMeta {
    pub source_path: String,
    pub total_count: usize,
    pub has_timestamps: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntriesPage {
    pub entries: Vec<crate::parser::HistoryEntry>,
    pub total_filtered: usize,
    pub offset: usize,
}

fn do_load(state: &State<AppState>) -> Result<HistoryMeta, String> {
    let parsed = parse_history(None)?;
    let meta = HistoryMeta {
        source_path: parsed.source_path.clone(),
        total_count: parsed.total_count,
        has_timestamps: parsed.has_timestamps,
    };
    *state.history.lock().unwrap() = Some(parsed);
    Ok(meta)
}

#[tauri::command]
pub fn load_history(state: State<AppState>) -> Result<HistoryMeta, String> {
    do_load(&state)
}

#[tauri::command]
pub fn reload_history(state: State<AppState>) -> Result<HistoryMeta, String> {
    do_load(&state)
}

#[tauri::command]
pub fn get_stats(state: State<AppState>, top_n: usize) -> Result<HistoryStats, String> {
    let guard = state.history.lock().unwrap();
    let parsed: &ParsedHistory = guard
        .as_ref()
        .ok_or("History not loaded. Call load_history first.")?;
    Ok(compute_stats(&parsed.entries, top_n, parsed.has_timestamps))
}

#[tauri::command]
pub fn get_entries(
    state: State<AppState>,
    offset: usize,
    limit: usize,
    search: Option<String>,
) -> Result<EntriesPage, String> {
    let guard = state.history.lock().unwrap();
    let parsed = guard
        .as_ref()
        .ok_or("History not loaded. Call load_history first.")?;

    let search_lower = search.as_deref().map(|s| s.to_lowercase());

    let filtered: Vec<_> = parsed
        .entries
        .iter()
        .filter(|e| {
            if let Some(ref q) = search_lower {
                e.command.to_lowercase().contains(q.as_str())
            } else {
                true
            }
        })
        .collect();

    let total_filtered = filtered.len();
    let page: Vec<_> = filtered
        .into_iter()
        .skip(offset)
        .take(limit)
        .cloned()
        .collect();

    Ok(EntriesPage {
        entries: page,
        total_filtered,
        offset,
    })
}

#[tauri::command]
pub fn get_command_detail(
    state: State<AppState>,
    path: Vec<String>,
    top_n: usize,
) -> Result<CommandDetail, String> {
    if path.is_empty() {
        return Err("path must not be empty".to_string());
    }
    let guard = state.history.lock().unwrap();
    let parsed = guard
        .as_ref()
        .ok_or("History not loaded. Call load_history first.")?;
    Ok(compute_command_detail(&parsed.entries, &path, top_n))
}

#[tauri::command]
pub fn get_command_docs(argv0: String) -> CommandDocs {
    fetch_docs(&argv0)
}

#[tauri::command]
pub fn get_entry_count(state: State<AppState>, search: Option<String>) -> Result<usize, String> {
    let guard = state.history.lock().unwrap();
    let parsed = guard
        .as_ref()
        .ok_or("History not loaded. Call load_history first.")?;

    if let Some(q) = search {
        let q_lower = q.to_lowercase();
        Ok(parsed
            .entries
            .iter()
            .filter(|e| e.command.to_lowercase().contains(q_lower.as_str()))
            .count())
    } else {
        Ok(parsed.total_count)
    }
}
