export default function AdminRequestLoading() {
  return (
    <div>
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-gray-200" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-6">
          <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
        </aside>
      </div>
    </div>
  );
}
