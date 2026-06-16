"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Settings } from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/history", label: "월별 이력", icon: CalendarDays },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col bg-slate-900">
      <div className="border-b border-slate-800 px-6 py-5">
        <h1 className="text-lg font-semibold text-white">Asset Snap</h1>
        <p className="mt-0.5 text-xs text-slate-400">자산 네비게이터</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-blue-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-6 py-4">
        <p className="text-xs text-slate-500">2026년 6월</p>
      </div>
    </aside>
  );
}
