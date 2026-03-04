use std::collections::HashMap;
use std::process::Command;
use regex::Regex;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandDocs {
    pub source: String,
    pub full_text: String,
    pub flag_descriptions: HashMap<String, String>,
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_escape = false;
    for ch in s.chars() {
        if in_escape {
            if ch.is_ascii_alphabetic() {
                in_escape = false;
            }
        } else if ch == '\x1b' {
            in_escape = true;
        } else {
            out.push(ch);
        }
    }
    out
}

fn strip_backspace_formatting(bytes: &[u8]) -> String {
    // Handle overstrike: char \x08 char sequences (bold/underline in man)
    let mut chars: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if i + 2 < bytes.len() && bytes[i + 1] == b'\x08' {
            // skip the char before backspace, keep the char after
            chars.push(bytes[i + 2]);
            i += 3;
        } else {
            chars.push(bytes[i]);
            i += 1;
        }
    }
    let s = String::from_utf8_lossy(&chars).into_owned();
    strip_ansi(&s)
}

fn run_help(argv0: &str) -> Option<String> {
    let output = Command::new(argv0).arg("--help").output().ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
    // Many tools write --help to stderr
    let text = if stdout.len() >= stderr.len() { stdout } else { stderr };
    let text = strip_ansi(&text);
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

fn run_man(argv0: &str) -> Option<String> {
    let output = Command::new("man")
        .arg(argv0)
        .env("MANPAGER", "cat")
        .env("MANWIDTH", "80")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = strip_backspace_formatting(&output.stdout);
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

fn parse_help_flags(text: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    // Match: 1-8 spaces indent, one or more "-flag" tokens (comma-separated), then 2+ spaces, description
    let Ok(re) = Regex::new(r"(?m)^[ \t]{1,8}((?:-\S+[ \t]*,?[ \t]*)+)[ \t]{2,}(\S.+)") else {
        return map;
    };
    for cap in re.captures_iter(text) {
        let flags_str = cap[1].trim();
        let desc = cap[2].trim().to_string();
        // Extract individual flags like -m, --message from the flags portion
        let Ok(flag_re) = Regex::new(r"-{1,2}[a-zA-Z0-9][a-zA-Z0-9_-]*") else {
            continue;
        };
        for flag_cap in flag_re.find_iter(flags_str) {
            map.insert(flag_cap.as_str().to_string(), desc.clone());
        }
    }
    map
}

fn parse_man_options(text: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    // Find OPTIONS section
    let Ok(section_re) = Regex::new(r"(?m)^OPTIONS\b") else {
        return map;
    };
    let options_text = if let Some(m) = section_re.find(text) {
        &text[m.start()..]
    } else {
        text
    };
    // Match flag lines at 5-12 space indent, followed by description lines at 8+ space indent
    let Ok(block_re) = Regex::new(r"(?m)^[ \t]{5,12}(-[^\n]+)\n((?:[ \t]{8,}[^\n]+\n?)*)") else {
        return map;
    };
    let Ok(flag_re) = Regex::new(r"-{1,2}[a-zA-Z0-9][a-zA-Z0-9_-]*") else {
        return map;
    };
    for cap in block_re.captures_iter(options_text) {
        let flags_line = cap[1].trim();
        let desc_block = cap[2]
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect::<Vec<_>>()
            .join(" ");
        if desc_block.is_empty() {
            continue;
        }
        for flag_cap in flag_re.find_iter(flags_line) {
            map.insert(flag_cap.as_str().to_string(), desc_block.clone());
        }
    }
    map
}

const MAX_FULL_TEXT: usize = 50 * 1024;

pub fn fetch_docs(argv0: &str) -> CommandDocs {
    let help_text = run_help(argv0);
    let help_flags = help_text
        .as_deref()
        .map(parse_help_flags)
        .unwrap_or_default();

    let (man_text, man_flags) = if help_flags.len() < 3 {
        let t = run_man(argv0);
        let f = t.as_deref().map(parse_man_options).unwrap_or_default();
        (t, f)
    } else {
        (None, HashMap::new())
    };

    // Merge: help flags take precedence; supplement with man flags
    let mut flag_descriptions = man_flags;
    flag_descriptions.extend(help_flags);

    let (source, full_text) = match (&help_text, &man_text) {
        (Some(h), _) => ("help".to_string(), h.clone()),
        (None, Some(m)) => ("man".to_string(), m.clone()),
        (None, None) => ("none".to_string(), String::new()),
    };

    let full_text = if full_text.len() > MAX_FULL_TEXT {
        full_text[..MAX_FULL_TEXT].to_string()
    } else {
        full_text
    };

    CommandDocs {
        source,
        full_text,
        flag_descriptions,
    }
}
