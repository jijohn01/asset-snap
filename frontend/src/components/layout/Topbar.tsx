"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Users, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchGroups, resetGroupIdCache, setActiveGroupId, type Group } from "@/lib/api";
import ConfirmModal from "@/components/ConfirmModal";

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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups()
      .then((gs) => {
        setGroups(gs);
        const savedId =
          typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
        const current =
          (savedId && gs.find((g) => g.id === savedId)) ||
          gs[0];
        if (current) setActiveGroup(current);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
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
    <>
      <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-[#e5e8eb] bg-white px-6 gap-4">
        {/* 로고 */}
        <Link
          href="/"
          className="text-lg hover:opacity-75 transition-opacity shrink-0"
        >
          <span className="font-bold text-primary-500">GET</span>
          <span className="font-bold text-ink">DON</span>
        </Link>

        {/* 그룹 전환기 */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-sm font-medium text-[#333d4b] hover:bg-[#e8ecf0] transition-colors"
          >
            <Users size={13} className="shrink-0 text-[#8b95a1]" />
            <span className="max-w-[120px] truncate">{activeGroup?.name ?? "장부 선택"}</span>
            <ChevronDown
              size={13}
              className={clsx(
                "shrink-0 text-[#8b95a1] transition-transform duration-150",
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
                  <Users size={13} className="shrink-0" />
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
                "px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "text-[#3182f6] border-b-2 border-[#3182f6]"
                  : "text-[#8b95a1] hover:text-[#333d4b] hover:bg-[#f2f4f6] rounded-lg"
              )}
            >
              {label}
            </Link>
          ))}
          <div className="mx-2 h-4 w-px bg-[#e5e8eb]" />
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#8b95a1] hover:text-[#333d4b] hover:bg-[#f2f4f6] transition-colors"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </nav>
      </header>
      <ConfirmModal
        open={logoutConfirmOpen}
        title="로그아웃"
        description="로그아웃 하시겠습니까?"
        confirmLabel="로그아웃"
        onConfirm={() => { setLogoutConfirmOpen(false); handleLogout(); }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}
