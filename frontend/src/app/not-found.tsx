import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-3xl">
            <span className="font-bold text-primary-500">GET</span>
            <span className="font-bold text-ink">DON</span>
          </h1>
          <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-6xl font-bold text-primary-500 mb-4">404</p>
          <h2 className="text-lg font-bold text-ink mb-2">
            페이지를 찾을 수 없어요
          </h2>
          <p className="text-sm text-[#8b95a1] mb-8">
            주소가 잘못되었거나 페이지가 삭제되었어요.
          </p>
          <Link
            href="/"
            className="block w-full rounded-2xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            대시보드로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
