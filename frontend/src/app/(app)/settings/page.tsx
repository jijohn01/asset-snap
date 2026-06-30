"use client";

import { useEffect, useState } from "react";
import { Users, Plus, X, Pencil, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchGroups,
  fetchGroupMembers,
  createGroup,
  updateGroup,
  inviteMember,
  updateMemberRole,
  removeMember,
  transferOwnership,
  setActiveGroupId,
  type Group,
  type Member,
} from "@/lib/api";
import PasswordChangeSection from "@/components/settings/PasswordChangeSection";
import ConfirmModal from "@/components/ConfirmModal";

const ROLE_LEFT_BORDER: Record<string, string> = {
  owner:  "#3182f6",
  editor: "#03b26c",
  viewer: "#e5e8eb",
};

const ROLE_BADGE: Record<string, string> = {
  owner:  "bg-[rgba(100,168,255,0.15)] text-[#2272eb]",
  editor: "bg-[rgba(3,178,108,0.15)] text-[#03b26c]",
  viewer: "bg-[rgba(2,32,71,0.05)] text-[#4e5968]",
};

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [membersByGroup, setMembersByGroup] = useState<Record<string, Member[]>>({});

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);

  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, string>>({});
  const [inviteLoading, setInviteLoading] = useState<Record<string, boolean>>({});
  const [inviteError, setInviteError] = useState<Record<string, string>>({});

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasEmailAuth, setHasEmailAuth] = useState(false);
  const [transferringTo, setTransferringTo] = useState<{
    groupId: string;
    userId: string;
  } | null>(null);
  const [transferConfirmInput, setTransferConfirmInput] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ groupId: string; userId: string; name: string } | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ groupId: string; groupName: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
        setUserEmail(data.user.email ?? null);
        const identities = data.user.identities ?? [];
        setHasEmailAuth(identities.some((i) => i.provider === "email"));
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .single();
        if (p?.display_name) setDisplayName(p.display_name);
      }
      const gs = await fetchGroups();
      setGroups(gs);
      await Promise.all(
        gs.filter((g) => g.role === "owner").map(async (g) => {
          const members = await fetchGroupMembers(g.id);
          setMembersByGroup((prev) => ({ ...prev, [g.id]: members }));
        })
      );
    }
    init();
  }, []);

  async function handleSaveName() {
    if (!currentUserId || !displayName.trim()) return;
    setNameLoading(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", currentUserId);
    setNameLoading(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const g = await createGroup(newGroupName.trim());
      setGroups((prev) => [...prev, { ...g, role: "owner" }]);
      setMembersByGroup((prev) => ({ ...prev, [g.id]: [] }));
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
    if (role === "owner") {
      setTransferringTo({ groupId, userId });
      setTransferConfirmInput("");
      setTransferError("");
      return;
    }
    await updateMemberRole(groupId, userId, role);
    setMembersByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((m) =>
        m.user_id === userId ? { ...m, role } : m
      ),
    }));
  }

  async function handleTransferOwnership(group: Group, targetMember: Member) {
    setTransferLoading(true);
    setTransferError("");
    try {
      await transferOwnership(group.id, targetMember.user_id);
      setMembersByGroup((prev) => ({
        ...prev,
        [group.id]: (prev[group.id] ?? []).map((m) =>
          m.user_id === targetMember.user_id ? { ...m, role: "owner" } : m
        ),
      }));
      setGroups((prev) =>
        prev.map((g) => g.id === group.id ? { ...g, role: "editor" } : g)
      );
      setTransferringTo(null);
      setTransferConfirmInput("");
    } catch (e) {
      setTransferError((e as Error).message);
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleRemoveMember(groupId: string, userId: string) {
    await removeMember(groupId, userId);
    setMembersByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).filter((m) => m.user_id !== userId),
    }));
  }

  async function handleLeaveGroup(groupId: string) {
    if (!currentUserId) return;
    await removeMember(groupId, currentUserId);
    const nextGroup = groups.find((g) => g.id !== groupId);
    const activeId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
    if (activeId === groupId && nextGroup) {
      setActiveGroupId(nextGroup.id);
    }
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  async function handleRenameGroup(group: Group) {
    const trimmed = editingGroupName.trim();
    if (!trimmed || trimmed === group.name) { setEditingGroupId(null); return; }
    const updated = await updateGroup(group.id, trimmed);
    setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, name: updated.name } : g));
    setEditingGroupId(null);
  }

  function handleSwitchGroup(group: Group) {
    setActiveGroupId(group.id);
    window.location.href = "/";
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-[22px] font-bold text-[#191f28]">설정</h1>

      {/* ── 프로필 ── */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8b95a1] border-b border-[#e5e8eb] pb-2">
          프로필
        </h2>
        <div className="flex items-center gap-3">
          <label className="w-16 shrink-0 text-sm text-[#6b7684]">닉네임</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            placeholder="닉네임 입력"
            className="flex-1 max-w-xs rounded-xl bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
          <button
            onClick={handleSaveName}
            disabled={nameLoading}
            className="rounded-2xl bg-[#3182f6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2272eb] hover:shadow-[0_4px_12px_rgba(49,130,246,0.35)] active:scale-[0.97] disabled:opacity-40 transition-all"
          >
            {nameSaved ? "저장됨" : nameLoading ? "저장 중" : "저장"}
          </button>
        </div>
      </section>

      {hasEmailAuth && userEmail && (
        <PasswordChangeSection email={userEmail} />
      )}

      {/* ── 내 장부 ── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8b95a1] border-b border-[#e5e8eb] pb-2">
          내 장부
        </h2>

        <div className="space-y-3">
          {groups.map((group) => {
            const isOwner = group.role === "owner";
            const members = membersByGroup[group.id] ?? [];
            const isEditing = editingGroupId === group.id;
            const accentColor = ROLE_LEFT_BORDER[group.role] ?? "#e5e8eb";

            return (
              <div
                key={group.id}
                className="bg-white rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                style={{ borderLeft: `4px solid ${accentColor}` }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Users size={15} className="shrink-0 text-[#8b95a1]" />
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameGroup(group);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        className="rounded-xl border border-[#3182f6] px-2 py-1 text-sm font-semibold text-[#191f28] outline-none w-36"
                      />
                    ) : (
                      <span className="font-semibold text-[#191f28] truncate">{group.name}</span>
                    )}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_BADGE[group.role] ?? ROLE_BADGE.viewer}`}>
                      {group.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {isOwner && isEditing ? (
                      <>
                        <button
                          onClick={() => handleRenameGroup(group)}
                          className="rounded-lg p-1.5 bg-[#3182f6] text-white hover:bg-[#2272eb] active:scale-[0.97] transition-all"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingGroupId(null)}
                          className="rounded-lg p-1.5 border border-[#e5e8eb] text-[#8b95a1] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        {isOwner && (
                          <button
                            onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                            className="rounded-lg p-1.5 text-[#b0b8c1] hover:text-[#4e5968] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
                            title="이름 변경"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {!isOwner && (
                          <button
                            onClick={() => setLeaveTarget({ groupId: group.id, groupName: group.name })}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#f04452] bg-[rgba(240,68,82,0.08)] hover:bg-[rgba(240,68,82,0.15)] active:scale-[0.97] transition-all"
                          >
                            탈퇴
                          </button>
                        )}
                        <button
                          onClick={() => handleSwitchGroup(group)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#2272eb] bg-[rgba(100,168,255,0.15)] hover:bg-[rgba(100,168,255,0.25)] active:scale-[0.97] transition-all"
                        >
                          보기
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Member section */}
                {isOwner ? (
                  <div className="border-t border-[#f2f4f6] px-5 pb-5">
                    <p className="pt-4 pb-2 text-xs font-semibold text-[#8b95a1] uppercase tracking-wide">멤버</p>
                    <div className="space-y-1">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-2 min-h-[52px]">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                              style={{
                                background: m.user_id === currentUserId ? "rgba(100,168,255,0.15)" : "rgba(2,32,71,0.05)",
                                color: m.user_id === currentUserId ? "#2272eb" : "#4e5968",
                              }}>
                              {(m.display_name ?? m.user_id).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-[#333d4b]">
                                {m.display_name ?? "알 수 없음"}
                              </span>
                              {m.user_id === currentUserId && (
                                <span className="ml-1.5 text-xs text-[#b0b8c1]">나</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.user_id !== currentUserId ? (
                              transferringTo?.groupId === group.id && transferringTo?.userId === m.user_id ? (
                                <div className="flex flex-col gap-2 py-1 w-full">
                                  <p className="text-xs font-semibold text-[#f04452]">
                                    소유권을 이전하면 되돌릴 수 없습니다.
                                  </p>
                                  <p className="text-xs text-[#4e5968]">
                                    {m.display_name ?? "이 멤버"}님이 새 owner가 되고, 나는 editor로 변경됩니다.
                                  </p>
                                  <p className="mt-1 text-xs text-[#4e5968]">아래 문장을 그대로 입력하세요:</p>
                                  <code className="block rounded-lg bg-[rgba(240,68,82,0.06)] px-3 py-2 text-xs font-mono text-[#f04452] break-all select-all">
                                    {`나는 ${group.name} 장부의 소유권을 ${m.display_name ?? "알 수 없음"}에게 이전합니다`}
                                  </code>
                                  <input
                                    type="text"
                                    value={transferConfirmInput}
                                    onChange={(e) => setTransferConfirmInput(e.target.value)}
                                    placeholder="위 문장을 그대로 입력"
                                    className="rounded-xl bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-3 py-2 text-xs text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#f04452] transition-colors"
                                  />
                                  {transferError && (
                                    <p className="text-xs text-[#f04452]">{transferError}</p>
                                  )}
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => handleTransferOwnership(group, m)}
                                      disabled={
                                        transferConfirmInput !==
                                          `나는 ${group.name} 장부의 소유권을 ${m.display_name ?? "알 수 없음"}에게 이전합니다` ||
                                        transferLoading
                                      }
                                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white bg-[#f04452] hover:bg-[#d63b47] active:scale-[0.97] disabled:opacity-40 transition-all"
                                    >
                                      {transferLoading ? "이전 중..." : "소유권 이전"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setTransferringTo(null);
                                        setTransferConfirmInput("");
                                        setTransferError("");
                                      }}
                                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#4e5968] bg-[#f2f4f6] hover:bg-[#e8ecf0] active:scale-[0.97] transition-all"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleRoleChange(group.id, m.user_id, e.target.value)}
                                    className="rounded-lg border border-[#e5e8eb] bg-white px-2 py-1.5 text-xs text-[#4e5968] outline-none focus:border-[#3182f6] cursor-pointer"
                                  >
                                    {members.length > 1 && <option value="owner">owner</option>}
                                    <option value="editor">editor</option>
                                    <option value="viewer">viewer</option>
                                  </select>
                                  <button
                                    onClick={() => setRemoveTarget({ groupId: group.id, userId: m.user_id, name: m.display_name ?? "이 멤버" })}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#f04452] bg-[rgba(240,68,82,0.08)] hover:bg-[rgba(240,68,82,0.15)] active:scale-[0.97] transition-all"
                                  >
                                    제거
                                  </button>
                                </>
                              )
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`}>
                                {m.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Invite */}
                    <div className="mt-3 pt-3 border-t border-[#f2f4f6]">
                      <p className="mb-2 text-xs font-semibold text-[#8b95a1] uppercase tracking-wide">멤버 초대</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={inviteEmail[group.id] ?? ""}
                          onChange={(e) => setInviteEmail((prev) => ({ ...prev, [group.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleInvite(group.id)}
                          placeholder="이메일 주소"
                          className="flex-1 rounded-xl bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-2.5 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
                        />
                        <select
                          value={inviteRole[group.id] ?? "editor"}
                          onChange={(e) => setInviteRole((prev) => ({ ...prev, [group.id]: e.target.value }))}
                          className="rounded-xl border border-[rgba(2,32,71,0.05)] bg-[rgba(0,23,51,0.02)] px-3 py-2.5 text-sm text-[#4e5968] outline-none focus:border-[#3182f6] cursor-pointer"
                        >
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                        </select>
                        <button
                          onClick={() => handleInvite(group.id)}
                          disabled={inviteLoading[group.id]}
                          className="rounded-2xl bg-[#3182f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2272eb] hover:shadow-[0_4px_12px_rgba(49,130,246,0.35)] active:scale-[0.97] disabled:opacity-40 transition-all"
                        >
                          {inviteLoading[group.id] ? "..." : "초대"}
                        </button>
                      </div>
                      {inviteError[group.id] && (
                        <p className="mt-1.5 text-xs text-[#f04452]">{inviteError[group.id]}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[#f2f4f6] px-5 py-3">
                    <p className="text-xs text-[#b0b8c1]">멤버 관리는 owner만 가능합니다.</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* New group form */}
          {showNewGroupForm ? (
            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] px-5 py-5"
              style={{ borderLeft: "4px solid #e5e8eb" }}>
              <p className="mb-3 text-sm font-semibold text-[#191f28]">새 가족 장부 만들기</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  placeholder="장부 이름 (예: 우리 가족)"
                  autoFocus
                  className="flex-1 rounded-xl bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-2.5 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="rounded-2xl bg-[#3182f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2272eb] hover:shadow-[0_4px_12px_rgba(49,130,246,0.35)] active:scale-[0.97] disabled:opacity-40 transition-all"
                >
                  {creatingGroup ? "생성 중" : "만들기"}
                </button>
                <button
                  onClick={() => { setShowNewGroupForm(false); setNewGroupName(""); }}
                  className="rounded-2xl border border-[#e5e8eb] px-3 py-2.5 text-sm text-[#8b95a1] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewGroupForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5e8eb] py-4 text-sm font-medium text-[#8b95a1] hover:border-[#3182f6] hover:text-[#2272eb] hover:bg-[rgba(100,168,255,0.05)] active:scale-[0.98] transition-all"
            >
              <Plus size={15} />
              새 가족 장부 만들기
            </button>
          )}
        </div>
      </section>
      <ConfirmModal
        open={removeTarget !== null}
        title="멤버 제거"
        description={`${removeTarget?.name}님을 장부에서 제거합니다.`}
        confirmLabel="제거"
        onConfirm={() => {
          if (removeTarget) handleRemoveMember(removeTarget.groupId, removeTarget.userId);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmModal
        open={leaveTarget !== null}
        title="장부 탈퇴"
        description={`${leaveTarget?.groupName}에서 탈퇴합니다. 다시 참여하려면 owner의 초대가 필요합니다.`}
        confirmLabel="탈퇴"
        onConfirm={async () => {
          try {
            if (leaveTarget) await handleLeaveGroup(leaveTarget.groupId);
          } finally {
            setLeaveTarget(null);
          }
        }}
        onCancel={() => setLeaveTarget(null)}
      />
    </div>
  );
}
