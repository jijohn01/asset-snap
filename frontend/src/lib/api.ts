import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class NoGroupsError extends Error {
  constructor() {
    super("장부가 없습니다.");
    this.name = "NoGroupsError";
  }
}

export interface Group {
  id: string;
  name: string;
  role: string;
}

export interface Member {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string | null;
}

export interface SnapshotItem {
  label: string;
  category: string;
  sort_order: number;
  memo: string;
  amount: number;
}

export type SnapshotData = Record<string, SnapshotItem>;

export interface SnapshotMetrics {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_surplus: number;
  equity_ratio: number;
  household_balance: number;
  emergency_fund: number;
  annual_surplus: number;
  annual_savings: number;
  annual_asset_increase: number;
  projected_year_end_assets: number;
}

export interface Snapshot {
  id: string;
  group_id: string;
  snapshot_month: string;
  data: SnapshotData;
  metrics: SnapshotMetrics;
  created_at: string;
}

// ── Auth ─────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  return res;
}

// ── Active Group ──────────────────────────────────────────────
let _groupId: string | null = null;

export function resetGroupIdCache() {
  _groupId = null;
  if (typeof window !== "undefined") localStorage.removeItem("activeGroupId");
}

export function setActiveGroupId(id: string) {
  _groupId = id;
  if (typeof window !== "undefined") localStorage.setItem("activeGroupId", id);
}

export async function getDefaultGroupId(): Promise<string> {
  if (_groupId) return _groupId;
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error("장부를 불러오지 못했습니다.");
  const groups: Group[] = await res.json();
  // localStorage 값을 현재 사용자의 그룹 목록으로 검증 — 다른 계정의 stale ID 방지
  const saved = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
  const current = (saved && groups.find((g) => g.id === saved))
    ?? groups[0];
  if (!current) throw new NoGroupsError();
  _groupId = current.id;
  if (typeof window !== "undefined") localStorage.setItem("activeGroupId", _groupId);
  return _groupId;
}

// ── Groups ────────────────────────────────────────────────────

export async function fetchGroups(): Promise<Group[]> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error("장부 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function updateGroup(groupId: string, name: string): Promise<Group> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("이름 변경에 실패했습니다.");
  return res.json();
}

export async function createGroup(name: string): Promise<Group> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("장부 생성에 실패했습니다.");
  return res.json();
}

// ── Members ───────────────────────────────────────────────────

export async function fetchGroupMembers(groupId: string): Promise<Member[]> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}/members`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error("멤버 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function inviteMember(groupId: string, email: string, role: string): Promise<Member> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "초대에 실패했습니다.");
  }
  return res.json();
}

export async function updateMemberRole(groupId: string, userId: string, role: string): Promise<Member> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}/members/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("역할 변경에 실패했습니다.");
  return res.json();
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}/members/${userId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

export async function transferOwnership(groupId: string, targetUserId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}/transfer-ownership`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "소유권 이전에 실패했습니다.");
  }
}

// ── Snapshots ─────────────────────────────────────────────────
export async function fetchSnapshots(): Promise<Snapshot[]> {
  const gid = await getDefaultGroupId();
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error("스냅샷 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchSnapshot(snapshotId: string): Promise<Snapshot> {
  const gid = await getDefaultGroupId();
  const res = await apiFetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`,
    { headers: await authHeader() },
  );
  if (!res.ok) throw new Error("스냅샷을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchPrefill(month: string): Promise<SnapshotData> {
  const gid = await getDefaultGroupId();
  const res = await apiFetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/prefill?month=${month}-01`,
    { headers: await authHeader() },
  );
  if (!res.ok) return {};
  return res.json();
}

export async function saveSnapshot(
  month: string,
  data: SnapshotData,
): Promise<Snapshot> {
  const gid = await getDefaultGroupId();
  const res = await apiFetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
  });
  if (!res.ok) throw new Error("저장에 실패했습니다.");
  return res.json();
}

export async function updateSnapshot(
  snapshotId: string,
  month: string,
  data: SnapshotData,
): Promise<Snapshot> {
  const gid = await getDefaultGroupId();
  const res = await apiFetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...await authHeader() },
      body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
    },
  );
  if (!res.ok) throw new Error("저장에 실패했습니다.");
  return res.json();
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const gid = await getDefaultGroupId();
  await apiFetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
