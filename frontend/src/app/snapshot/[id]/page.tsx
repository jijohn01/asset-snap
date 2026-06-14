"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SnapshotForm, { SnapshotDataPayload } from "@/components/SnapshotForm";

interface SnapshotResponse {
  id: string;
  snapshot_month: string;
  data: {
    assets: Record<string, Record<string, number>>;
    liabilities: Record<string, Record<string, number>>;
    income: Record<string, Record<string, number>>;
    expenses: Record<string, Record<string, number>>;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function flattenAmounts(data: SnapshotResponse["data"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const section of Object.values(data)) {
    for (const subcategory of Object.values(section)) {
      for (const [itemId, val] of Object.entries(subcategory)) {
        if (val > 0) result[itemId] = String(val);
      }
    }
  }
  return result;
}

export default function SnapshotEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/snapshots/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setSnapshot)
      .catch(() => setLoadError("스냅샷을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(month: string, data: SnapshotDataPayload) {
    setSaveError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/snapshots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
      });
      if (res.ok) {
        router.push("/history");
      } else {
        setSaveError("저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      setSaveError("서버에 연결할 수 없습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 스냅샷을 삭제할까요?")) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/v1/snapshots/${id}`, { method: "DELETE" });
      router.push("/history");
    } catch {
      setSaveError("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  const month = snapshot?.snapshot_month.slice(0, 7) ?? "";

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">스냅샷 수정</h2>
      <p className="mt-1 text-sm text-gray-500">
        {month ? `${month.replace("-", "년 ")}월` : ""}
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}
        {loadError && <p className="text-sm text-red-500">{loadError}</p>}
        {snapshot && (
          <SnapshotForm
            initialMonth={month}
            initialAmounts={flattenAmounts(snapshot.data)}
            saveLabel="수정 저장"
            submitting={submitting}
            deleting={deleting}
            error={saveError}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
