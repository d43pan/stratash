mod commands;
mod detail;
mod manpage;
mod parser;
mod stats;

use std::sync::Mutex;
use parser::ParsedHistory;

pub struct AppState {
    pub history: Mutex<Option<ParsedHistory>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            history: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_history,
            commands::get_stats,
            commands::get_entries,
            commands::get_entry_count,
            commands::reload_history,
            commands::get_command_detail,
            commands::get_command_docs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
