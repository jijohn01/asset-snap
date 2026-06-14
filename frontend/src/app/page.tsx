export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
      <p className="mt-1 text-sm text-gray-500">최신 스냅샷 기준 자산 현황</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {["순자산", "자기자본비율", "월소득", "월잉여금"].map((label) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-300">—</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">순자산 트렌드</p>
          <div className="mt-4 flex h-40 items-center justify-center text-sm text-gray-300">
            차트 준비 중
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">자산 구성</p>
          <div className="mt-4 flex h-40 items-center justify-center text-sm text-gray-300">
            차트 준비 중
          </div>
        </div>
      </div>
    </div>
  );
}
