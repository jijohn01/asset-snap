"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("비밀번호 변경에 실패했습니다. 링크가 만료됐을 수 있습니다.");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl">
            <span className="font-bold text-primary-500">GET</span>
            <span className="font-bold text-ink">DON</span>
          </h1>
          <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#191f28] mb-6">새 비밀번호 설정</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#333d4b] mb-2">새 비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333d4b] mb-2">비밀번호 확인</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            {error && <p className="text-sm text-[#f04452]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#3182f6] py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors mt-2"
            >
              {loading ? "변경 중" : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
