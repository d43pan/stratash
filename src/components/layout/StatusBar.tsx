interface StatusBarProps {
  sourcePath: string | null;
  totalCount: number | null;
  hasTimestamps: boolean | null;
}

export function StatusBar({ sourcePath, totalCount, hasTimestamps }: StatusBarProps) {
  return (
    <footer className="h-7 bg-slate-900 border-t border-slate-700 flex items-center px-4 gap-6 text-xs text-slate-500 shrink-0">
      {sourcePath ? (
        <>
          <span className="font-mono truncate max-w-xs" title={sourcePath}>
            {sourcePath}
          </span>
          <span className="shrink-0">
            {totalCount?.toLocaleString()} entries
          </span>
          <span className="shrink-0">
            {hasTimestamps ? "✓ timestamps" : "no timestamps"}
          </span>
        </>
      ) : (
        <span>Loading…</span>
      )}
    </footer>
  );
}
