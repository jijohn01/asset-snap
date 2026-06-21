"use client";

import { useEffect, useState } from "react";
import { Users, User, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchGroups,
  fetchGroupMembers,
  createGroup,
  inviteMember,
  updateMemberRole,
  removeMember,
  setActiveGroupId,
  type Group,
  type Member,
} from "@/lib/api";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [membersByGroup, setMembersByGroup] = useState<Record<string, Member[]>>({});

  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);

  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, string>>({});
  const [inviteLoading, setInviteLoading] = useState<Record<string, boolean>>({});
  const [inviteError, setInviteError] = useState<Record<string, string>>({});

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .single()
          .then(({ data: p }) => {
            if (p?.display_name) setDisplayName(p.display_name);
          });
      }
    });
    loadGroups();
  }, []);

  async function loadGroups() {
    const gs = await fetchGroups();
    setGroups(gs);
  }

  async function handleSaveName() {
    if (!currentUserId || !displayName.trim()) return;
    setNameLoading(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", currentUserId);
    setNameLoading(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleExpandGroup(group: Group) {
    if (expandedGroupId === group.id) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(group.id);
    if (!membersByGroup[group.id]) {
      const members = await fetchGroupMembers(group.id);
      setMembersByGroup((prev) => ({ ...prev, [group.id]: members }));
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const g = await createGroup(newGroupName.trim(), "group");
      setGroups((prev) => [...prev, g]);
      setNewGroupName("");
      setShowNewGroupForm(false);
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleInvite(groupId: string) {
    const email = inviteEmail[groupId]?.trim();
    const role = inviteRole[groupId] ?? "editor";
    if (!email) return;
    setInviteLoading((prev) => ({ ...prev, [groupId]: true }));
    setInviteError((prev) => ({ ...prev, [groupId]: "" }));
    try {
      const member = await inviteMember(groupId, email, role);
      setMembersByGroup((prev) => ({
        ...prev,
        [groupId]: [...(prev[groupId] ?? []), member],
      }));
      setInviteEmail((prev) => ({ ...prev, [groupId]: "" }));
    } catch (e) {
      setInviteError((prev) => ({ ...prev, [groupId]: (e as Error).message }));
    } finally {
      setInviteLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  }

  async function handleRoleChange(groupId: string, userId: string, role: string) {
    await updateMemberRole(groupId, userId, role);
    setMembersByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((m) =>
        m.user_id === userId ? { ...m, role } : m
      ),
    }));
  }

  async function handleRemoveMember(groupId: string, userId: string) {
    await removeMember(groupId, userId);
    setMembersByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).filter((m) => m.user_id !== userId),
    }));
  }

  function handleSwitchGroup(group: Group) {
    setActiveGroupId(group.id);
    window.location.href = "/";
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold text-[#111]">설정</h1>

      {/* ── 프로필 ── */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] border-b border-[#E4E4E7] pb-2">
          프로필
        </h2>
        <div className="flex items-center gap-3">
          <label className="w-16 shrink-0 text-sm text-[#6B6B6B]">닉네임</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 max-w-xs rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10"
          />
          <button
            onClick={handleSaveName}
            disabled={nameLoading}
            className="rounded-lg bg-[#3182F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B6EF3] disabled:opacity-50 transition-colors"
          >
            {nameSaved ? "저장됨 ✓" : nameLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>

      {/* ── 내 장부 ── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6B6B6B] border-b border-[#E4E4E7] pb-2">
          내 장부
        </h2>

        <div className="space-y-3">
          {groups.map((group) => {
            const isOwner = group.role === "owner";
            const isExpanded = expandedGroupId === group.id;
            const members = membersByGroup[group.id] ?? [];

            return (
              <div key={group.id} className="rounded-xl border border-[#E4E4E7] bg-white overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => handleExpandGroup(group)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {group.type === "group" ? (
                      <Users size={16} className="text-[#6B6B6B]" />
                    ) : (
                      <User size={16} className="text-[#6B6B6B]" />
                    )}
                    <span className="font-semibold text-[#111]">{group.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      group.role === "owner" ? "bg-[#EBF3FF] text-[#3182F6]" :
                      group.role === "editor" ? "bg-[#E6F9F5] text-[#00B493]" :
                      "bg-[#F5F5F7] text-[#6B6B6B]"
                    }`}>
                      {group.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSwitchGroup(group); }}
                      className="rounded-md px-3 py-1 text-xs text-[#3182F6] border border-[#3182F6] hover:bg-[#EBF3FF] transition-colors"
                    >
                      이 장부 보기
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-[#6B6B6B]" /> : <ChevronDown size={14} className="text-[#6B6B6B]" />}
                  </div>
                </button>

                {/* Expanded: member list + invite */}
                {isExpanded && (
                  <div className="border-t border-[#F0F0F0] px-5 py-4">
                    <p className="mb-2 text-xs font-medium text-[#6B6B6B]">멤버</p>
                    <div className="space-y-2 mb-4">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF] text-xs font-semibold text-[#3182F6]">
                              {(m.display_name ?? m.user_id).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-[#111]">
                              {m.display_name ?? "알 수 없음"}
                              {m.user_id === currentUserId && <span className="ml-1 text-xs text-[#aaa]">(나)</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwner && m.user_id !== currentUserId ? (
                              <>
                                <select
                                  value={m.role}
                                  onChange={(e) => handleRoleChange(group.id, m.user_id, e.target.value)}
                                  className="rounded-md border border-[#E4E4E7] px-2 py-1 text-xs outline-none focus:border-[#3182F6]"
                                >
                                  <option value="owner">owner</option>
                                  <option value="editor">editor</option>
                                  <option value="viewer">viewer</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(group.id, m.user_id)}
                                  className="rounded-md border border-[#fcd2d5] px-2 py-1 text-xs text-[#F04452] hover:bg-[#fff5f6] transition-colors"
                                >
                                  제거
                                </button>
                              </>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                m.role === "owner" ? "bg-[#EBF3FF] text-[#3182F6]" :
                                m.role === "editor" ? "bg-[#E6F9F5] text-[#00B493]" :
                                "bg-[#F5F5F7] text-[#6B6B6B]"
                              }`}>
                                {m.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Invite form (owner only) */}
                    {isOwner && (
                      <div className="border-t border-[#F0F0F0] pt-4">
                        <p className="mb-2 text-xs font-medium text-[#6B6B6B]">멤버 초대</p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={inviteEmail[group.id] ?? ""}
                            onChange={(e) => setInviteEmail((prev) => ({ ...prev, [group.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleInvite(group.id)}
                            placeholder="이메일 입력..."
                            className="flex-1 rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10"
                          />
                          <select
                            value={inviteRole[group.id] ?? "editor"}
                            onChange={(e) => setInviteRole((prev) => ({ ...prev, [group.id]: e.target.value }))}
                            className="rounded-lg border border-[#E4E4E7] px-2 py-2 text-sm outline-none focus:border-[#3182F6]"
                          >
                            <option value="editor">editor</option>
                            <option value="viewer">viewer</option>
                          </select>
                          <button
                            onClick={() => handleInvite(group.id)}
                            disabled={inviteLoading[group.id]}
                            className="rounded-lg bg-[#3182F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B6EF3] disabled:opacity-50 transition-colors"
                          >
                            {inviteLoading[group.id] ? "..." : "초대"}
                          </button>
                        </div>
                        {inviteError[group.id] && (
                          <p className="mt-1.5 text-xs text-[#F04452]">{inviteError[group.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* New group */}
          {showNewGroupForm ? (
            <div className="rounded-xl border border-[#E4E4E7] bg-white px-5 py-4">
              <p className="mb-3 text-sm font-semibold text-[#111]">새 가족 장부 만들기</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  placeholder="장부 이름 (예: 우리 가족)"
                  autoFocus
                  className="flex-1 rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/10"
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="rounded-lg bg-[#3182F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B6EF3] disabled:opacity-50 transition-colors"
                >
                  {creatingGroup ? "생성 중..." : "만들기"}
                </button>
                <button
                  onClick={() => { setShowNewGroupForm(false); setNewGroupName(""); }}
                  className="rounded-lg border border-[#E4E4E7] px-3 py-2 text-sm text-[#6B6B6B] hover:bg-[#F5F5F7] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewGroupForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1D5DB] py-4 text-sm text-[#6B6B6B] hover:border-[#3182F6] hover:text-[#3182F6] hover:bg-[#F0F7FF] transition-all"
            >
              <Plus size={16} />
              새 가족 장부 만들기
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
