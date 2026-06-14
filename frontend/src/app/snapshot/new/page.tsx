export default function SnapshotNewPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">스냅샷 입력</h2>
      <p className="mt-1 text-sm text-gray-500">이번 달 자산 현황을 입력하세요</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-8 text-sm">
          {["1. 자산", "2. 부채", "3. 소득", "4. 지출"].map((step, i) => (
            <span
              key={step}
              className={i === 0 ? "font-semibold text-indigo-600" : "text-gray-300"}
            >
              {step}
            </span>
          ))}
        </div>
        <div className="mt-8 flex h-60 items-center justify-center text-sm text-gray-300">
          입력 폼 준비 중
        </div>
      </div>
    </div>
  );
}
