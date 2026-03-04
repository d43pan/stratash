export function NoTimestampState() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🕐</div>
        <h3 className="text-slate-300 font-semibold mb-2">No Timestamps Available</h3>
        <p className="text-slate-500 text-sm">
          Your bash history does not contain timestamps. Enable{" "}
          <code className="text-blue-400 font-mono">HISTTIMEFORMAT</code> in{" "}
          <code className="text-blue-400 font-mono">~/.bashrc</code> to record
          timestamps for future commands.
        </p>
        <pre className="mt-4 bg-slate-800 rounded-md px-4 py-3 text-xs text-green-400 text-left">
          {`# Add to ~/.bashrc:\nexport HISTTIMEFORMAT="%F %T "`}
        </pre>
      </div>
    </div>
  );
}
