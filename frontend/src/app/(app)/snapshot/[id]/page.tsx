"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SnapshotForm, { type SnapshotData } from "@/components/SnapshotForm";
import { fetchSnapshot, updateSnapshot, deleteSnapshot, type Snapshot } from "@/lib/api";

export default function SnapshotEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshot(id)
      .then(setSnapshot)
      .catch(() => setLoadError("스냅샷을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(month: string, data: SnapshotData) {
    setSaveError(null);
    setSubmitting(true);
    try {
      await updateSnapshot(id, month, data);
      router.push("/history");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 스냅샷을 삭제할까요?")) return;
    setDeleting(true);
    try {
      await deleteSnapshot(id);
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
            initialData={snapshot.data}
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
