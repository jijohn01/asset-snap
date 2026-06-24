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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      setLoading(true);
      fetchSnapshots()
        .then((data) =>
          setSnapshots(data.sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month)))
        )
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    load();
    window.addEventListener("group-changed", load);
    return () => window.removeEventListener("group-changed", load);
  }, []);

  function requestDelete(id: string) {
    setConfirmingId(id);
  }

  async function confirmDelete(id: string) {
    setConfirmingId(null);
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
          <h2 className="text-2xl font-bold text-[#191f28]">월별 이력</h2>
          <p className="mt-1 text-sm text-[#8b95a1]">스냅샷 타임라인</p>
        </div>
        <Link
          href="/snapshot/new"
          className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2272eb] transition-colors"
        >
          + 새 스냅샷
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 rounded-md bg-[#F0F0F0]" />
                <div className="flex gap-4">
                  <div className="h-3 w-28 rounded-md bg-[#F0F0F0]" />
                  <div className="h-3 w-20 rounded-md bg-[#F0F0F0]" />
                  <div className="h-3 w-16 rounded-md bg-[#F0F0F0]" />
                </div>
              </div>
              <div className="flex animate-pulse gap-2">
                <div className="h-7 w-20 rounded-xl bg-[#F0F0F0]" />
                <div className="h-7 w-14 rounded-xl bg-[#F0F0F0]" />
              </div>
            </div>
          ))}
        {!loading && snapshots.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#8b95a1]">아직 스냅샷이 없어요.</p>
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
              className="flex items-center justify-between rounded-xl bg-white p-5 transition-colors hover:bg-[#f9fafb] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              <div>
                <p className="text-sm font-semibold text-[#191f28]">{fmtMonth(s.snapshot_month)}</p>
                <div className="mt-1 flex gap-4 text-xs text-[#8b95a1]">
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
                  className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5968] hover:bg-[#e8ecf0] transition-colors"
                >
                  <Pencil size={13} />
                  보기 / 수정
                </Link>

                {confirmingId === s.id ? (
                  <>
                    <span className="text-xs text-[#4e5968]">정말 삭제할까요?</span>
                    <button
                      type="button"
                      data-testid="confirm-delete"
                      disabled={deletingId === s.id}
                      onClick={() => confirmDelete(s.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-[rgba(240,68,82,0.08)] px-3 py-1.5 text-xs font-medium text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] transition-colors disabled:opacity-50"
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-cancel"
                      onClick={() => setConfirmingId(null)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5968] hover:bg-[#e8ecf0] transition-colors"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={deletingId === s.id}
                    onClick={() => requestDelete(s.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-[rgba(240,68,82,0.08)] px-3 py-1.5 text-xs font-medium text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
