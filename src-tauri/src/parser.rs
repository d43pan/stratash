use chrono::{DateTime, TimeZone, Utc};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub index: usize,
    pub timestamp: Option<DateTime<Utc>>,
    pub command: String,
    pub argv0: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedHistory {
    pub entries: Vec<HistoryEntry>,
    pub has_timestamps: bool,
    pub source_path: String,
    pub total_count: usize,
}

fn extract_argv0(command: &str) -> String {
    // Skip KEY=val tokens, take first token
    for token in command.split_whitespace() {
        if !token.contains('=') || token.starts_with('-') {
            // Strip any leading path components
            let base = token.rsplit('/').next().unwrap_or(token);
            return base.to_string();
        }
    }
    // All tokens were KEY=val assignments; take the last one's value
    command
        .split_whitespace()
        .last()
        .and_then(|t| t.split('=').next_back())
        .unwrap_or("")
        .to_string()
}

fn resolve_history_path() -> PathBuf {
    if let Ok(p) = std::env::var("HISTFILE") {
        let path = PathBuf::from(&p);
        if path.exists() {
            return path;
        }
    }
    if let Some(home) = dirs::home_dir() {
        return home.join(".bash_history");
    }
    PathBuf::from(".bash_history")
}

fn join_continuation(lines: &[&str]) -> String {
    let mut result = String::new();
    for (i, line) in lines.iter().enumerate() {
        if line.ends_with('\\') && i + 1 < lines.len() {
            result.push_str(&line[..line.len() - 1]);
            result.push(' ');
        } else {
            result.push_str(line);
        }
    }
    result
}

pub fn parse_history(path: Option<PathBuf>) -> Result<ParsedHistory, String> {
    let path = path.unwrap_or_else(resolve_history_path);
    let source_path = path.to_string_lossy().to_string();

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", source_path, e))?;

    // Detect format: first non-blank line matches #<digits>
    let has_timestamps = content
        .lines()
        .find(|l| !l.trim().is_empty())
        .map(|l| is_timestamp_line(l))
        .unwrap_or(false);

    let entries = if has_timestamps {
        parse_timestamped(&content)
    } else {
        parse_plain(&content)
    };

    let total_count = entries.len();
    Ok(ParsedHistory {
        entries,
        has_timestamps,
        source_path,
        total_count,
    })
}

fn is_timestamp_line(line: &str) -> bool {
    let trimmed = line.trim();
    if !trimmed.starts_with('#') {
        return false;
    }
    trimmed[1..].chars().all(|c| c.is_ascii_digit()) && trimmed.len() > 1
}

fn parse_timestamped(content: &str) -> Vec<HistoryEntry> {
    let mut entries = Vec::new();
    let mut pending_ts: Option<i64> = None;
    let mut pending_lines: Vec<String> = Vec::new();
    let mut index = 0usize;

    let flush = |pending_ts: &mut Option<i64>,
                 pending_lines: &mut Vec<String>,
                 entries: &mut Vec<HistoryEntry>,
                 index: &mut usize| {
        if pending_lines.is_empty() {
            return;
        }
        let refs: Vec<&str> = pending_lines.iter().map(|s| s.as_str()).collect();
        let command = join_continuation(&refs);
        if !command.trim().is_empty() {
            let argv0 = extract_argv0(&command);
            let timestamp = pending_ts.and_then(|ts| Utc.timestamp_opt(ts, 0).single());
            entries.push(HistoryEntry {
                index: *index,
                timestamp,
                command,
                argv0,
            });
            *index += 1;
        }
        pending_lines.clear();
        *pending_ts = None;
    };

    for line in content.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if is_timestamp_line(line) {
            flush(
                &mut pending_ts,
                &mut pending_lines,
                &mut entries,
                &mut index,
            );
            pending_ts = line.trim()[1..].parse::<i64>().ok();
        } else {
            pending_lines.push(line.to_string());
            // If line doesn't end with \, it's the end of the command
            if !line.ends_with('\\') {
                flush(
                    &mut pending_ts,
                    &mut pending_lines,
                    &mut entries,
                    &mut index,
                );
            }
        }
    }
    // Flush any remaining
    flush(
        &mut pending_ts,
        &mut pending_lines,
        &mut entries,
        &mut index,
    );

    entries
}

fn parse_plain(content: &str) -> Vec<HistoryEntry> {
    let mut entries = Vec::new();
    let mut continuation_lines: Vec<String> = Vec::new();
    let mut index = 0usize;

    let flush =
        |continuation_lines: &mut Vec<String>, entries: &mut Vec<HistoryEntry>, index: &mut usize| {
            if continuation_lines.is_empty() {
                return;
            }
            let refs: Vec<&str> = continuation_lines.iter().map(|s| s.as_str()).collect();
            let command = join_continuation(&refs);
            if !command.trim().is_empty() {
                let argv0 = extract_argv0(&command);
                entries.push(HistoryEntry {
                    index: *index,
                    timestamp: None,
                    command,
                    argv0,
                });
                *index += 1;
            }
            continuation_lines.clear();
        };

    for line in content.lines() {
        if line.trim().is_empty() {
            flush(&mut continuation_lines, &mut entries, &mut index);
            continue;
        }
        continuation_lines.push(line.to_string());
        if !line.ends_with('\\') {
            flush(&mut continuation_lines, &mut entries, &mut index);
        }
    }
    flush(&mut continuation_lines, &mut entries, &mut index);

    entries
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn write_temp(content: &str) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(content.as_bytes()).unwrap();
        f
    }

    #[test]
    fn test_plain_history() {
        let f = write_temp("ls -la\necho hello\ngit status\n");
        let result = parse_history(Some(f.path().to_path_buf())).unwrap();
        assert!(!result.has_timestamps);
        assert_eq!(result.entries.len(), 3);
        assert_eq!(result.entries[0].command, "ls -la");
        assert_eq!(result.entries[0].argv0, "ls");
        assert_eq!(result.entries[1].command, "echo hello");
        assert_eq!(result.entries[2].command, "git status");
    }

    #[test]
    fn test_timestamped_history() {
        let f = write_temp("#1700000000\nls -la\n#1700000001\necho hello\n");
        let result = parse_history(Some(f.path().to_path_buf())).unwrap();
        assert!(result.has_timestamps);
        assert_eq!(result.entries.len(), 2);
        assert!(result.entries[0].timestamp.is_some());
        assert_eq!(result.entries[0].command, "ls -la");
        assert_eq!(result.entries[1].command, "echo hello");
    }

    #[test]
    fn test_multiline_continuation() {
        let f = write_temp("echo \\\nhello \\\nworld\nnext command\n");
        let result = parse_history(Some(f.path().to_path_buf())).unwrap();
        assert_eq!(result.entries.len(), 2);
        assert_eq!(result.entries[0].command, "echo  hello  world");
    }

    #[test]
    fn test_empty_file() {
        let f = write_temp("");
        let result = parse_history(Some(f.path().to_path_buf())).unwrap();
        assert_eq!(result.entries.len(), 0);
    }

    #[test]
    fn test_file_not_found() {
        let result = parse_history(Some(PathBuf::from("/nonexistent/path/.bash_history")));
        assert!(result.is_err());
    }

    #[test]
    fn test_argv0_with_env_vars() {
        assert_eq!(extract_argv0("FOO=bar git commit -m 'test'"), "git");
        assert_eq!(extract_argv0("ls"), "ls");
        assert_eq!(extract_argv0("/usr/bin/python3 script.py"), "python3");
    }
}
