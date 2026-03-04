use crate::parser::HistoryEntry;
use chrono::{Datelike, Timelike, Weekday};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandCount {
    pub command: String,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivity {
    pub date: String, // ISO date "YYYY-MM-DD"
    pub count: usize,
}

/// [hour][day_of_week] counts (hour 0-23, day 0=Mon..6=Sun)
pub type HourDayGrid = Vec<Vec<usize>>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelinePoint {
    pub date: String,
    pub count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStats {
    pub top_commands: Vec<CommandCount>,
    pub daily_activity: Vec<DailyActivity>,
    pub hour_day_grid: HourDayGrid,
    pub timeline_daily: Vec<TimelinePoint>,
    pub timeline_weekly: Vec<TimelinePoint>,
    pub has_timestamps: bool,
}

pub fn compute_stats(entries: &[HistoryEntry], top_n: usize, has_timestamps: bool) -> HistoryStats {
    let mut cmd_counts: HashMap<String, usize> = HashMap::new();
    let mut daily_map: HashMap<String, usize> = HashMap::new();
    // hour_day_grid[hour][weekday]
    let mut hour_day_grid: Vec<Vec<usize>> = vec![vec![0usize; 7]; 24];
    let mut weekly_map: HashMap<String, usize> = HashMap::new();

    for entry in entries {
        *cmd_counts.entry(entry.argv0.clone()).or_insert(0) += 1;

        if let Some(ts) = &entry.timestamp {
            let date_str = ts.format("%Y-%m-%d").to_string();
            *daily_map.entry(date_str).or_insert(0) += 1;

            let hour = ts.hour() as usize;
            let weekday = match ts.weekday() {
                Weekday::Mon => 0,
                Weekday::Tue => 1,
                Weekday::Wed => 2,
                Weekday::Thu => 3,
                Weekday::Fri => 4,
                Weekday::Sat => 5,
                Weekday::Sun => 6,
            };
            hour_day_grid[hour][weekday] += 1;

            // Week key: ISO year-week
            let iso_week = ts.iso_week();
            let week_str = format!("{}-W{:02}", iso_week.year(), iso_week.week());
            *weekly_map.entry(week_str).or_insert(0) += 1;
        }
    }

    // Top commands sorted descending
    let mut top_commands: Vec<CommandCount> = cmd_counts
        .into_iter()
        .map(|(command, count)| CommandCount { command, count })
        .collect();
    top_commands.sort_by(|a, b| b.count.cmp(&a.count));
    if top_n > 0 {
        top_commands.truncate(top_n);
    }

    // Daily activity sorted by date
    let mut daily_activity: Vec<DailyActivity> = daily_map
        .into_iter()
        .map(|(date, count)| DailyActivity { date, count })
        .collect();
    daily_activity.sort_by(|a, b| a.date.cmp(&b.date));

    // Timeline daily
    let mut timeline_daily: Vec<TimelinePoint> = daily_activity
        .iter()
        .map(|d| TimelinePoint {
            date: d.date.clone(),
            count: d.count,
        })
        .collect();
    timeline_daily.sort_by(|a, b| a.date.cmp(&b.date));

    // Timeline weekly sorted by week string
    let mut timeline_weekly: Vec<TimelinePoint> = weekly_map
        .into_iter()
        .map(|(date, count)| TimelinePoint { date, count })
        .collect();
    timeline_weekly.sort_by(|a, b| a.date.cmp(&b.date));

    HistoryStats {
        top_commands,
        daily_activity,
        hour_day_grid,
        timeline_daily,
        timeline_weekly,
        has_timestamps,
    }
}
