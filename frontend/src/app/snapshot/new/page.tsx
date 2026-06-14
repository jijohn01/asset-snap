"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SnapshotForm, { SnapshotDataPayload } from "@/components/SnapshotForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function flattenAmounts(data: SnapshotDataPayload): Record<string, string> {
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

export default function SnapshotNewPage() {
  const router = useRouter();
  const [initialAmounts, setInitialAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/snapshots/`)
      .then((r) => r.json())
      .then((snapshots: { snapshot_month: string; data: SnapshotDataPayload }[]) => {
        if (snapshots.length > 0) {
          const latest = snapshots.sort((a, b) =>
            b.snapshot_month.localeCompare(a.snapshot_month)
          )[0];
          setInitialAmounts(flattenAmounts(latest.data));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(month: string, data: SnapshotDataPayload) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/snapshots/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
      });
      if (res.ok) {
        router.push("/history");
      } else {
        setError("저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">새 스냅샷</h2>
      <p className="mt-1 text-sm text-gray-500">직전 스냅샷 기준으로 미리 채워져 있습니다</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <SnapshotForm
            initialMonth={currentMonth()}
            initialAmounts={initialAmounts}
            saveLabel="저장"
            submitting={submitting}
            error={error}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
