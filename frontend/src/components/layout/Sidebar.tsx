"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Settings, LogOut, ChevronDown, User, Users } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchGroups, resetGroupIdCache, setActiveGroupId, type Group } from "@/lib/api";

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/history", label: "월별 이력", icon: CalendarDays },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups().then((gs) => {
      setGroups(gs);
      const savedId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
      const current = (savedId && gs.find((g) => g.id === savedId)) || gs.find((g) => g.type === "personal") || gs[0];
      if (current) setActiveGroup(current);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectGroup(group: Group) {
    setActiveGroup(group);
    setActiveGroupId(group.id);
    setOpen(false);
    router.refresh();
  }

  async function handleLogout() {
    resetGroupIdCache();
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

      {/* Group Switcher */}
      <div className="px-3 py-3 border-b border-[#1A1A1A]" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-md bg-[#1A1A1A] px-3 py-2 text-sm text-white hover:bg-[#252525] transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            {activeGroup?.type === "group" ? <Users size={14} className="shrink-0 text-[#888]" /> : <User size={14} className="shrink-0 text-[#888]" />}
            <span className="truncate">{activeGroup?.name ?? "장부 선택"}</span>
          </span>
          <ChevronDown size={14} className={clsx("shrink-0 text-[#888] transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="mt-1 rounded-md border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                  g.id === activeGroup?.id ? "text-white bg-[#252525]" : "text-[#888888] hover:bg-[#252525] hover:text-white"
                )}
              >
                {g.type === "group" ? <Users size={13} className="shrink-0" /> : <User size={13} className="shrink-0" />}
                <span className="truncate">{g.name}</span>
                {g.id === activeGroup?.id && <span className="ml-auto text-[#3182F6]">✓</span>}
              </button>
            ))}
          </div>
        )}
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
