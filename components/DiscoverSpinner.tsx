export function DiscoverSpinner({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      className={
        overlay
          ? "fixed inset-0 z-50 flex items-center justify-center bg-white/75"
          : "flex min-h-screen items-center justify-center bg-background"
      }
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      <span className="sr-only">Loading roles</span>
    </div>
  )
}
