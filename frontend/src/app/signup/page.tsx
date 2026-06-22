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
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">Asset Snap</h1>
          <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#191f28] mb-6">회원가입</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "닉네임", type: "text", value: nickname, onChange: setNickname, autoComplete: "nickname", placeholder: "홍길동" },
              { label: "이메일", type: "email", value: email, onChange: setEmail, autoComplete: "email", placeholder: "name@email.com" },
              { label: "비밀번호", type: "password", value: password, onChange: setPassword, autoComplete: "new-password", placeholder: "6자 이상" },
              { label: "비밀번호 확인", type: "password", value: confirmPassword, onChange: setConfirmPassword, autoComplete: "new-password", placeholder: "비밀번호 재입력" },
            ].map(({ label, type, value, onChange, autoComplete, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-[#333d4b] mb-2">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-[#f04452]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#3182f6] py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors mt-2"
            >
              {loading ? "처리 중" : "가입하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8b95a1]">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#3182f6] font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
