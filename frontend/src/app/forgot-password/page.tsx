"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSent(true);
    setLoading(false);
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
          {sent ? (
            <div className="text-center">
              <p className="text-[#191f28] font-semibold mb-2">이메일을 확인해주세요</p>
              <p className="text-sm text-[#8b95a1] mb-6">
                비밀번호 재설정 링크를 <span className="text-[#333d4b]">{email}</span>로 보냈습니다.
              </p>
              <Link href="/login" className="text-sm text-[#3182f6] font-semibold hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#191f28] mb-2">비밀번호 재설정</h2>
              <p className="text-sm text-[#8b95a1] mb-6">
                가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#333d4b] mb-2">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@email.com"
                    className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#3182f6] py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors mt-2"
                >
                  {loading ? "전송 중" : "재설정 링크 발송"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm">
                <Link href="/login" className="text-[#3182f6] font-semibold hover:underline">
                  로그인으로 돌아가기
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
