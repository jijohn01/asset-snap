"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { fetchSnapshots, updateSnapshot, deleteSnapshot, type Snapshot, type SnapshotData } from "@/lib/api";
import SnapshotForm from "@/components/SnapshotForm";

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
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      setLoading(true);
      setError(null);
      fetchSnapshots()
        .then((data) =>
          setSnapshots(data.sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month)))
        )
        .catch((e) => setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
        .finally(() => setLoading(false));
    }
    load();
    window.addEventListener("group-changed", load);
    return () => window.removeEventListener("group-changed", load);
  }, []);

  function handleRowClick(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setFormError(null);
  }

  async function handleSave(snapshotId: string, month: string, data: SnapshotData) {
    setFormError(null);
    setSubmitting(true);
    try {
      const updated = await updateSnapshot(snapshotId, month, data);
      setSnapshots((prev) =>
        prev
          .map((s) => (s.id === snapshotId ? updated : s))
          .sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month))
      );
      setExpandedId(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 스냅샷을 삭제할까요?")) return;
    setDeleting(true);
    try {
      await deleteSnapshot(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      setExpandedId(null);
    } catch {
      setFormError("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
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
            <div key={i} className="rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-24 rounded-md bg-[#F0F0F0]" />
                <div className="flex gap-4">
                  <div className="h-3 w-28 rounded-md bg-[#F0F0F0]" />
                  <div className="h-3 w-20 rounded-md bg-[#F0F0F0]" />
                  <div className="h-3 w-16 rounded-md bg-[#F0F0F0]" />
                </div>
              </div>
            </div>
          ))}
        {!loading && error && (
          <div className="rounded-xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#F04452]">{error}</p>
          </div>
        )}
        {!loading && !error && snapshots.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#8b95a1]">아직 스냅샷이 없어요.</p>
            <Link href="/snapshot/new" className="mt-2 inline-block text-sm text-primary-500 hover:underline">
              첫 스냅샷 입력하기
            </Link>
          </div>
        )}
        {snapshots.map((s, idx) => {
          const diffInfo = calcDiff(snapshots, idx);
          const isExpanded = expandedId === s.id;
          const month = s.snapshot_month.slice(0, 7);

          return (
            <div
              key={s.id}
              className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleRowClick(s.id)}
                className="group w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-[#f9fafb]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#191f28]">{fmtMonth(s.snapshot_month)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm font-medium text-[#333d4b]">순자산 {fmt(s.metrics.net_worth)}</span>
                    {diffInfo && (
                      diffInfo.diff === 0 ? (
                        <span className="text-xs text-[#b0b8c1]">변동없음</span>
                      ) : (
                        <span className={`text-xs font-medium ${diffInfo.diff > 0 ? "text-positive" : "text-negative"}`}>
                          {diffInfo.diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diffInfo.diff))}
                          {diffInfo.pct != null && ` (${Math.abs(diffInfo.pct).toFixed(1)}%)`}
                        </span>
                      )
                    )}
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-[#b0b8c1] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <span>자산 {fmt(s.metrics.total_assets)}</span>
                    <span>부채 {fmt(s.metrics.total_liabilities)}</span>
                    <span>잉여금 {fmt(s.metrics.monthly_surplus)}</span>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-[#8b95a1] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isExpanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-[#f2f4f6] p-5">
                    {formError && isExpanded && (
                      <p className="mb-4 text-sm text-[#F04452]">{formError}</p>
                    )}
                    <SnapshotForm
                      initialMonth={month}
                      initialData={s.data}
                      saveLabel="수정 저장"
                      submitting={submitting}
                      deleting={deleting}
                      error={null}
                      onSave={(m, data) => handleSave(s.id, m, data)}
                      onDelete={() => handleDelete(s.id)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
