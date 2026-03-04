import { useState } from "react";
import { useHistoryData } from "./hooks/useHistoryData";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { TopCommandsView } from "./views/TopCommandsView";
import { ActivityHeatmapView } from "./views/ActivityHeatmapView";
import { TimelineView } from "./views/TimelineView";
import { HistoryBrowserView } from "./views/HistoryBrowserView";
import { CommandDetailView } from "./views/CommandDetailView";
import type { ViewName } from "./types/history";

type ViewState =
  | { view: "top-commands" }
  | { view: "heatmap" }
  | { view: "timeline" }
  | { view: "browser" }
  | { view: "command-detail"; path: string[] };

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ view: "top-commands" });
  const { meta, stats, loading, error, reload } = useHistoryData();
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await reload();
    } finally {
      setReloading(false);
    }
  };

  const handleViewChange = (view: ViewName) => {
    setViewState({ view } as ViewState);
  };

  // Sidebar highlights "top-commands" when in command-detail
  const sidebarActiveView: ViewName =
    viewState.view === "command-detail" ? "top-commands" : viewState.view;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar
        activeView={sidebarActiveView}
        onViewChange={handleViewChange}
        onReload={handleReload}
        reloading={reloading}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-hidden relative">
          {loading && <LoadingSpinner />}
          {error && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-lg text-center">
                <h2 className="text-red-400 font-semibold mb-2">
                  Failed to load history
                </h2>
                <pre className="text-red-300 text-xs text-left overflow-auto max-h-40 bg-black/30 rounded p-3">
                  {error}
                </pre>
              </div>
            </div>
          )}
          {!loading && !error && stats && meta && (
            <ErrorBoundary>
              {viewState.view === "top-commands" && (
                <TopCommandsView
                  stats={stats}
                  onCommandClick={(cmd) =>
                    setViewState({ view: "command-detail", path: [cmd] })
                  }
                />
              )}
              {viewState.view === "heatmap" && (
                <ActivityHeatmapView stats={stats} />
              )}
              {viewState.view === "timeline" && <TimelineView stats={stats} />}
              {viewState.view === "browser" && (
                <HistoryBrowserView meta={meta} />
              )}
              {viewState.view === "command-detail" && (
                <CommandDetailView
                  path={viewState.path}
                  onNavigate={(newPath) => {
                    if (newPath.length === 0)
                      setViewState({ view: "top-commands" });
                    else setViewState({ view: "command-detail", path: newPath });
                  }}
                />
              )}
            </ErrorBoundary>
          )}
        </main>

        <StatusBar
          sourcePath={meta?.sourcePath ?? null}
          totalCount={meta?.totalCount ?? null}
          hasTimestamps={meta?.hasTimestamps ?? null}
        />
      </div>
    </div>
  );
}
