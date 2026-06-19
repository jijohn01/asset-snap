"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Settings, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/history", label: "월별 이력", icon: CalendarDays },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 flex-col bg-[#0A0A0A]">
      <div className="border-b border-[#1A1A1A] px-6 py-5">
        <h1 className="text-lg font-semibold text-white">Asset Snap</h1>
        <p className="mt-0.5 text-xs text-[#888888]">자산 네비게이터</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-primary-500 text-white"
                : "text-[#888888] hover:bg-[#1F1F1F] hover:text-white"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-[#1A1A1A] px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#888888] transition-colors hover:bg-[#1F1F1F] hover:text-white"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
