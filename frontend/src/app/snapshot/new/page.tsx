"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SnapshotForm, { SnapshotDataPayload } from "@/components/SnapshotForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SnapshotNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <p className="mt-1 text-sm text-gray-500">이번 달 자산 현황을 입력하세요</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <SnapshotForm
          initialMonth={currentMonth()}
          saveLabel="저장"
          submitting={submitting}
          error={error}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
