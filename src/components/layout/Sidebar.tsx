import type { ViewName } from "../../types/history";

interface NavItem {
  id: ViewName;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "top-commands", label: "Top Commands", icon: "▦" },
  { id: "heatmap", label: "Activity Heatmap", icon: "◫" },
  { id: "timeline", label: "Timeline", icon: "↗" },
  { id: "browser", label: "History Browser", icon: "☰" },
];

interface SidebarProps {
  activeView: ViewName;
  onViewChange: (view: ViewName) => void;
  onReload: () => void;
  reloading: boolean;
}

export function Sidebar({ activeView, onViewChange, onReload, reloading }: SidebarProps) {
  return (
    <aside className="w-52 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="px-4 py-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">histviz</h1>
        <p className="text-xs text-slate-500 mt-0.5">bash history visualizer</p>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              activeView === item.id
                ? "bg-blue-600/30 text-blue-300 font-medium"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-700">
        <button
          onClick={onReload}
          disabled={reloading}
          className="w-full px-3 py-2 rounded-md text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className={reloading ? "animate-spin" : ""}>↺</span>
          {reloading ? "Reloading…" : "Reload"}
        </button>
      </div>
    </aside>
  );
}
