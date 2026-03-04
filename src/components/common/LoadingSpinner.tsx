export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading history…</span>
      </div>
    </div>
  );
}
