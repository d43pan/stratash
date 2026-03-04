use crate::parser::HistoryEntry;
use crate::stats::{CommandCount, TimelinePoint};
use chrono::{TimeZone, Utc};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandDetail {
    pub argv0: String,
    pub total_count: usize,
    pub top_flags: Vec<CommandCount>,
    pub top_subcommands: Vec<CommandCount>,
    pub top_pipes: Vec<CommandCount>,
    pub top_redirects: Vec<CommandCount>,
    pub top_invocations: Vec<CommandCount>,
    pub usage_timeline: Vec<TimelinePoint>,
    pub has_timestamps: bool,
    pub first_seen: Option<String>,
    pub last_seen: Option<String>,
}

fn cmd_argv0(cmd: &str) -> Option<String> {
    cmd.split_whitespace()
        .next()
        .map(|token| token.rsplit('/').next().unwrap_or(token).to_string())
}

/// Walk tokens[1..] (index 0 = argv0, already consumed), skip flags and
/// redirect operators + their targets, and return the remaining positional
/// arguments in order.
fn extract_positionals(tokens: &[&str]) -> Vec<String> {
    let standalone_ops = [">>", "2>", "&>", ">"];
    let attached_prefixes = [">>", "2>", "&>", ">"];
    let mut result = Vec::new();
    let mut i = 1; // skip argv0
    while i < tokens.len() {
        let tok = tokens[i];

        // Standalone redirect operator → skip next token
        if standalone_ops.contains(&tok) {
            i += 2;
            continue;
        }

        // Attached redirect: `>>file`, `2>file`, `&>file`, `>file`
        let mut is_redirect = false;
        for &pfx in &attached_prefixes {
            if tok.starts_with(pfx) && tok.len() > pfx.len() {
                is_redirect = true;
                break;
            }
        }
        if is_redirect {
            i += 1;
            continue;
        }

        // Flag
        if tok.starts_with('-') {
            i += 1;
            continue;
        }

        // Positional argument
        result.push(tok.to_string());
        i += 1;
    }
    result
}

pub fn compute_command_detail(
    entries: &[HistoryEntry],
    path: &[String], // path[0]=argv0, path[1..]=positional levels to match
    top_n: usize,
) -> CommandDetail {
    let argv0 = &path[0];
    let depth = path.len() - 1; // number of positional levels already specified

    let mut flags_map: HashMap<String, usize> = HashMap::new();
    let mut subcmds_map: HashMap<String, usize> = HashMap::new();
    let mut pipes_map: HashMap<String, usize> = HashMap::new();
    let mut redirects_map: HashMap<String, usize> = HashMap::new();
    let mut invocations_map: HashMap<String, usize> = HashMap::new();
    let mut daily_map: HashMap<String, usize> = HashMap::new();
    let mut total_count = 0usize;
    let mut first_unix: Option<i64> = None;
    let mut last_unix: Option<i64> = None;
    let mut has_timestamps = false;

    for entry in entries {
        if entry.argv0 != *argv0 {
            continue;
        }

        // Split on `|` (naive — ignores quoted pipes)
        let parts: Vec<&str> = entry.command.split('|').collect();
        let tokens: Vec<&str> = parts[0].split_whitespace().collect();

        // Check that the positional path matches
        let positionals = extract_positionals(&tokens);
        if depth > 0 {
            if positionals.len() < depth {
                continue;
            }
            if !path[1..]
                .iter()
                .zip(positionals.iter())
                .all(|(p, q)| p == q)
            {
                continue;
            }
        }

        total_count += 1;

        // Tally next-level subcommand (positional at index `depth`)
        if let Some(sub) = positionals.get(depth) {
            *subcmds_map.entry(sub.clone()).or_insert(0) += 1;
        }

        // Full invocation tally
        *invocations_map.entry(entry.command.clone()).or_insert(0) += 1;

        // Timestamp tracking
        if let Some(ts) = &entry.timestamp {
            has_timestamps = true;
            let unix = ts.timestamp();
            first_unix = Some(first_unix.map_or(unix, |e: i64| e.min(unix)));
            last_unix = Some(last_unix.map_or(unix, |e: i64| e.max(unix)));
            let date_str = ts.format("%Y-%m-%d").to_string();
            *daily_map.entry(date_str).or_insert(0) += 1;
        }

        // Pipe targets: argv0 of each part after the first
        for part in parts.iter().skip(1) {
            if let Some(name) = cmd_argv0(part.trim()) {
                if !name.is_empty() {
                    *pipes_map.entry(name).or_insert(0) += 1;
                }
            }
        }

        // Parse main part (parts[0]) for flags and redirects
        let mut i = 1; // skip argv0
        let standalone_ops = [">>", "2>", "&>", ">"];

        while i < tokens.len() {
            let tok = tokens[i];

            // Standalone redirect operator → next token is target
            if standalone_ops.contains(&tok) {
                if i + 1 < tokens.len() {
                    *redirects_map
                        .entry(tokens[i + 1].to_string())
                        .or_insert(0) += 1;
                    i += 2;
                } else {
                    i += 1;
                }
                continue;
            }

            // Attached redirect: `>>file`, `2>file`, `&>file`, `>file`
            // Check longer prefixes first to avoid `>` matching `>>file`
            let attached_prefixes = [">>", "2>", "&>", ">"];
            let mut matched_redirect = false;
            for &pfx in &attached_prefixes {
                if tok.starts_with(pfx) && tok.len() > pfx.len() {
                    *redirects_map
                        .entry(tok[pfx.len()..].to_string())
                        .or_insert(0) += 1;
                    matched_redirect = true;
                    break;
                }
            }
            if matched_redirect {
                i += 1;
                continue;
            }

            if tok.starts_with('-') {
                *flags_map.entry(tok.to_string()).or_insert(0) += 1;
            }

            i += 1;
        }
    }

    // Sort descending, optionally truncate
    let sort_top = |map: HashMap<String, usize>| -> Vec<CommandCount> {
        let mut v: Vec<CommandCount> = map
            .into_iter()
            .map(|(command, count)| CommandCount { command, count })
            .collect();
        v.sort_by(|a, b| b.count.cmp(&a.count));
        if top_n > 0 {
            v.truncate(top_n);
        }
        v
    };

    // Build daily timeline
    let mut timeline: Vec<TimelinePoint> = daily_map
        .into_iter()
        .map(|(date, count)| TimelinePoint { date, count })
        .collect();
    timeline.sort_by(|a, b| a.date.cmp(&b.date));

    fn fmt_date(unix: i64) -> String {
        Utc.timestamp_opt(unix, 0)
            .single()
            .map(|dt| dt.format("%Y-%m-%d").to_string())
            .unwrap_or_default()
    }

    CommandDetail {
        argv0: argv0.clone(),
        total_count,
        top_flags: sort_top(flags_map),
        top_subcommands: sort_top(subcmds_map),
        top_pipes: sort_top(pipes_map),
        top_redirects: sort_top(redirects_map),
        top_invocations: sort_top(invocations_map),
        usage_timeline: timeline,
        has_timestamps,
        first_seen: first_unix.map(fmt_date),
        last_seen: last_unix.map(fmt_date),
    }
}
