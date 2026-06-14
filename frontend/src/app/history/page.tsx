export default function HistoryPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">월별 이력</h2>
      <p className="mt-1 text-sm text-gray-500">스냅샷 타임라인</p>

      <div className="mt-6 space-y-3">
        {["2026년 6월", "2026년 5월", "2026년 4월"].map((month) => (
          <div key={month} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">{month}</p>
            <p className="mt-1 text-xs text-gray-300">데이터 준비 중</p>
          </div>
        ))}
      </div>
    </div>
  );
}
