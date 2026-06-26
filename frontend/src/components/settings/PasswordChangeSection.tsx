"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PasswordChangeSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError("");

    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setError("현재 비밀번호가 올바르지 않습니다");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || "비밀번호 변경에 실패했습니다");
        return;
      }

      await supabase.auth.signOut({ scope: "others" });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8b95a1] border-b border-[#e5e8eb] pb-2">
        계정 보안
      </h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">현재 비밀번호</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="새 비밀번호 재입력"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        {error && <p className="text-xs text-[#f04452] pl-[108px]">{error}</p>}
        <div className="flex items-center gap-3 pl-[108px]">
          <button
            onClick={handleSubmit}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-2xl bg-[#3182f6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors"
          >
            {loading ? "변경 중" : "변경"}
          </button>
          {success && (
            <span className="text-xs font-semibold text-[#03b26c]">변경됐습니다</span>
          )}
        </div>
      </div>
    </section>
  );
}
