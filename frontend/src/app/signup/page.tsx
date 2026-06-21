"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // 이메일 확인이 필요한 경우 identities가 비어있음
    if (data.user && data.user.identities?.length === 0) {
      setError("이미 가입된 이메일입니다.");
      setLoading(false);
      return;
    }

    await supabase
      .from("profiles")
      .upsert({ id: data.user!.id, display_name: nickname.trim() });

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">AssetNavigator</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">개인 자산 관리 서비스</p>
        </div>

        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-[#111111] mb-6">회원가입</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                autoComplete="nickname"
                className="w-full px-3 py-2.5 text-sm border border-[#E4E4E7] rounded-lg bg-white text-[#111111] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-colors"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm border border-[#E4E4E7] rounded-lg bg-white text-[#111111] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-colors"
                placeholder="name@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2.5 text-sm border border-[#E4E4E7] rounded-lg bg-white text-[#111111] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-colors"
                placeholder="6자 이상"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2.5 text-sm border border-[#E4E4E7] rounded-lg bg-white text-[#111111] placeholder:text-[#BBBBBB] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10 transition-colors"
                placeholder="비밀번호 재입력"
              />
            </div>

            {error && (
              <p className="text-sm text-[#F04452]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#3182F6] hover:bg-[#1B6EF3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : "가입하기"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#6B6B6B]">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#3182F6] font-medium hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
