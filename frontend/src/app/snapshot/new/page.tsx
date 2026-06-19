"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SnapshotForm, { type SnapshotData } from "@/components/SnapshotForm";
import { fetchPrefill, saveSnapshot } from "@/lib/api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SnapshotNewPage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<SnapshotData>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const month = currentMonth();

  useEffect(() => {
    fetchPrefill(month)
      .then(setInitialData)
      .finally(() => setLoading(false));
  }, [month]);

  async function handleSave(m: string, data: SnapshotData) {
    setSubmitting(true);
    setError(null);
    try {
      await saveSnapshot(m, data);
      router.push("/history");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
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
            initialMonth={month}
            initialData={initialData}
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
