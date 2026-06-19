"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { fetchSnapshots, deleteSnapshot, type Snapshot } from "@/lib/api";

function fmt(val: number) {
  return val.toLocaleString() + "만원";
}

function calcDiff(snapshots: Snapshot[], idx: number) {
  if (idx >= snapshots.length - 1) return null;
  const curr = snapshots[idx].metrics.net_worth;
  const prev = snapshots[idx + 1].metrics.net_worth;
  const diff = curr - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : null;
  return { diff, pct };
}

function fmtMonth(iso: string) {
  const [year, month] = iso.split("-");
  return `${year}년 ${parseInt(month)}월`;
}

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshots()
      .then((data) =>
        setSnapshots(data.sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month)))
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 스냅샷을 삭제할까요?")) return;
    setDeletingId(id);
    try {
      await deleteSnapshot(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">월별 이력</h2>
          <p className="mt-1 text-sm text-gray-500">스냅샷 타임라인</p>
        </div>
        <Link
          href="/snapshot/new"
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + 새 스냅샷
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}
        {!loading && snapshots.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400">스냅샷이 없습니다.</p>
            <Link href="/snapshot/new" className="mt-2 inline-block text-sm text-primary-500 hover:underline">
              첫 스냅샷 입력하기
            </Link>
          </div>
        )}
        {snapshots.map((s, idx) => {
          const diffInfo = calcDiff(snapshots, idx);
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-gray-700">{fmtMonth(s.snapshot_month)}</p>
                <div className="mt-1 flex gap-4 text-xs text-gray-400">
                  <span>순자산 {fmt(s.metrics.net_worth)}</span>
                  {diffInfo && (
                    diffInfo.diff === 0 ? (
                      <span className="text-gray-400">─ 변동없음</span>
                    ) : (
                      <span className={diffInfo.diff > 0 ? "text-positive" : "text-negative"}>
                        {diffInfo.diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diffInfo.diff))}
                        {diffInfo.pct != null && ` (${Math.abs(diffInfo.pct).toFixed(1)}%)`}
                      </span>
                    )
                  )}
                  <span>자산 {fmt(s.metrics.total_assets)}</span>
                  <span>부채 {fmt(s.metrics.total_liabilities)}</span>
                  <span>월잉여금 {fmt(s.metrics.monthly_surplus)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/snapshot/${s.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Pencil size={13} />
                  보기 / 수정
                </Link>
                <button
                  type="button"
                  disabled={deletingId === s.id}
                  onClick={() => handleDelete(s.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
