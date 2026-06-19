const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
// issue #3(로그인) 구현 전까지 localStorage 또는 env 값 사용
export function getUserId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("user_id");
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? "";
}

function authHeader(): Record<string, string> {
  const uid = getUserId();
  return uid ? { "X-User-ID": uid } : {};
}

// ── Group ID ─────────────────────────────────────────────────
let _groupId: string | null = null;

export async function getDefaultGroupId(): Promise<string> {
  if (_groupId) return _groupId;
  const res = await fetch(`${API_URL}/api/v1/asset-groups/`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("장부를 불러오지 못했습니다.");
  const groups: { id: string; type: string }[] = await res.json();
  const personal = groups.find((g) => g.type === "personal") ?? groups[0];
  if (!personal) throw new Error("개인 장부가 없습니다.");
  _groupId = personal.id;
  return _groupId;
}

// ── Snapshots ─────────────────────────────────────────────────
export async function fetchSnapshots(): Promise<Snapshot[]> {
  const gid = await getDefaultGroupId();
  const res = await fetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("스냅샷 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchSnapshot(snapshotId: string): Promise<Snapshot> {
  const gid = await getDefaultGroupId();
  const res = await fetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`,
    { headers: authHeader() },
  );
  if (!res.ok) throw new Error("스냅샷을 불러오지 못했습니다.");
  return res.json();
}

export async function fetchPrefill(month: string): Promise<SnapshotData> {
  const gid = await getDefaultGroupId();
  const res = await fetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/prefill?month=${month}-01`,
    { headers: authHeader() },
  );
  if (!res.ok) return {};
  return res.json();
}

export async function saveSnapshot(
  month: string,
  data: SnapshotData,
): Promise<Snapshot> {
  const gid = await getDefaultGroupId();
  const res = await fetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
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
  const res = await fetch(
    `${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
    },
  );
  if (!res.ok) throw new Error("저장에 실패했습니다.");
  return res.json();
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const gid = await getDefaultGroupId();
  await fetch(`${API_URL}/api/v1/asset-groups/${gid}/snapshots/${snapshotId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
}
