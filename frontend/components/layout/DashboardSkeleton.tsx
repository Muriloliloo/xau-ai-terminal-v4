export function DashboardSkeleton() {
  return (
    <div aria-label="Carregando análise" aria-busy="true" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="loading-shimmer h-[102px] rounded-lg" />
        ))}
      </div>
      <div className="loading-shimmer h-52 rounded-lg" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="loading-shimmer h-80 rounded-lg" />
        <div className="loading-shimmer h-80 rounded-lg" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="loading-shimmer h-80 rounded-lg" />
        <div className="loading-shimmer h-80 rounded-lg" />
      </div>
    </div>
  );
}
