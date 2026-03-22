export function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col animate-pulse">
      <div
        className="flex h-12 shrink-0 items-center justify-between px-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
          <div className="h-4 w-24 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
          <div className="h-4 w-32 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
          <div className="h-7 w-20 rounded-md" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-12 py-10">
        <div className="mb-8 h-9 w-1/3 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
        <div className="mb-6 space-y-3">
          {[1, 0.92, 0.8, 1, 0.67].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded"
              style={{ backgroundColor: "var(--color-bg-secondary)", width: `${w * 100}%` }}
            />
          ))}
        </div>
        <div className="mb-5 h-7 w-1/4 rounded" style={{ backgroundColor: "var(--color-bg-secondary)" }} />
        <div className="space-y-3">
          {[1, 0.92, 0.8, 1].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded"
              style={{ backgroundColor: "var(--color-bg-secondary)", width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
