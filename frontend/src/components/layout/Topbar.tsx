"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, User, Users, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchGroups, resetGroupIdCache, setActiveGroupId, type Group } from "@/lib/api";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/history", label: "월별 이력" },
  { href: "/settings", label: "설정" },
] as const;

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [open, setOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [userInitial, setUserInitial] = useState("U");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups()
      .then((gs) => {
        setGroups(gs);
        const savedId =
          typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
        const current =
          (savedId && gs.find((g) => g.id === savedId)) ||
          gs.find((g) => g.type === "personal") ||
          gs[0];
        if (current) setActiveGroup(current);
      })
      .catch(() => {});

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .single()
        .then(({ data: p }) => {
          const name = p?.display_name || data.user.email || "U";
          setUserInitial(name.charAt(0).toUpperCase());
        });
    });
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSelectGroup(group: Group) {
    setActiveGroup(group);
    setActiveGroupId(group.id);
    setOpen(false);
    window.dispatchEvent(new Event("group-changed"));
  }

  async function handleLogout() {
    resetGroupIdCache();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center bg-[#0f172a] px-6 gap-4">
      {/* 로고 */}
      <Link href="/" className="text-lg hover:opacity-80 transition-opacity shrink-0">
        <span className="font-bold text-primary-400">GET</span>
        <span className="font-bold text-white">DON</span>
      </Link>

      {/* 그룹 전환기 */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/15 transition-colors"
        >
          {activeGroup?.type === "group" ? (
            <Users size={13} className="shrink-0 text-white/50" />
          ) : (
            <User size={13} className="shrink-0 text-white/50" />
          )}
          <span className="max-w-[120px] truncate">{activeGroup?.name ?? "장부 선택"}</span>
          <ChevronDown
            size={13}
            className={clsx(
              "shrink-0 text-white/50 transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 min-w-[180px] rounded-xl border border-[#e5e8eb] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] overflow-hidden">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={clsx(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                  g.id === activeGroup?.id
                    ? "bg-[rgba(100,168,255,0.1)] text-[#2272eb] font-medium"
                    : "text-[#333d4b] hover:bg-[#f2f4f6]"
                )}
              >
                {g.type === "group" ? (
                  <Users size={13} className="shrink-0" />
                ) : (
                  <User size={13} className="shrink-0" />
                )}
                <span className="truncate flex-1">{g.name}</span>
                {g.id === activeGroup?.id && (
                  <span className="text-[#3182f6] text-xs ml-auto">✓</span>
                )}
              </button>
            ))}
            <div className="border-t border-[#e5e8eb]">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#3182f6] hover:bg-[rgba(100,168,255,0.05)] transition-colors"
              >
                <Plus size={13} className="shrink-0" />
                새 장부 만들기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="ml-auto flex items-center gap-0.5">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "px-3 py-2 text-sm font-medium transition-colors rounded-lg",
              pathname === href
                ? "text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/10"
            )}
          >
            {label}
          </Link>
        ))}

        <div className="mx-2 h-4 w-px bg-white/20" />

        {/* 사용자 아바타 */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white hover:bg-primary-400 active:scale-[0.97] transition-all"
          >
            {userInitial}
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-[#e5e8eb] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] overflow-hidden">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#f04452] hover:bg-[rgba(240,68,82,0.05)] transition-colors"
              >
                <LogOut size={13} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
