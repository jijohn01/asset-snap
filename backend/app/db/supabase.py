from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


# ── Asset Groups ──────────────────────────────────────────────────────────────

def get_groups_for_user(user_id: str) -> list[dict]:
    db = get_supabase()
    res = (
        db.table("asset_groups")
        .select("*, asset_group_members!inner(role)")
        .eq("asset_group_members.user_id", user_id)
        .execute()
    )
    rows = res.data or []
    # flatten role out of nested join
    for row in rows:
        members = row.pop("asset_group_members", [])
        row["role"] = members[0]["role"] if members else None
    return rows


def get_group(group_id: str) -> dict | None:
    db = get_supabase()
    res = db.table("asset_groups").select("*").eq("id", group_id).single().execute()
    return res.data


def create_group(name: str, group_type: str, created_by: str) -> dict:
    db = get_supabase()
    res = (
        db.table("asset_groups")
        .insert({"name": name, "type": group_type, "created_by": created_by})
        .execute()
    )
    group = res.data[0]
    db.table("asset_group_members").insert(
        {"group_id": group["id"], "user_id": created_by, "role": "owner"}
    ).execute()
    return group


def update_group(group_id: str, name: str) -> dict | None:
    db = get_supabase()
    res = (
        db.table("asset_groups")
        .update({"name": name})
        .eq("id", group_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_group(group_id: str) -> None:
    db = get_supabase()
    db.table("asset_groups").delete().eq("id", group_id).execute()


# ── Group Members ─────────────────────────────────────────────────────────────

def get_members(group_id: str) -> list[dict]:
    db = get_supabase()
    res = (
        db.table("asset_group_members")
        .select("*, profiles(display_name)")
        .eq("group_id", group_id)
        .execute()
    )
    return res.data or []


def add_member(group_id: str, user_id: str, role: str = "viewer") -> dict:
    db = get_supabase()
    res = (
        db.table("asset_group_members")
        .insert({"group_id": group_id, "user_id": user_id, "role": role})
        .execute()
    )
    return res.data[0]


def update_member_role(group_id: str, user_id: str, role: str) -> dict | None:
    db = get_supabase()
    res = (
        db.table("asset_group_members")
        .update({"role": role})
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def remove_member(group_id: str, user_id: str) -> None:
    db = get_supabase()
    (
        db.table("asset_group_members")
        .delete()
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )


def get_user_id_by_email(email: str) -> str | None:
    db = get_supabase()
    users = db.auth.admin.list_users()
    user = next((u for u in users if u.email == email), None)
    return str(user.id) if user else None


def get_member_role(group_id: str, user_id: str) -> str | None:
    db = get_supabase()
    res = (
        db.table("asset_group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return res.data["role"] if res.data else None


# ── Snapshots ─────────────────────────────────────────────────────────────────

def get_snapshots(group_id: str) -> list[dict]:
    db = get_supabase()
    res = (
        db.table("snapshots")
        .select("*")
        .eq("group_id", group_id)
        .order("snapshot_month", desc=True)
        .execute()
    )
    return res.data or []


def get_snapshot(snapshot_id: str) -> dict | None:
    db = get_supabase()
    res = db.table("snapshots").select("*").eq("id", snapshot_id).single().execute()
    return res.data


def upsert_snapshot(group_id: str, snapshot_month: str, data: dict, metrics: dict, created_by: str) -> dict:
    db = get_supabase()
    payload = {
        "group_id": group_id,
        "snapshot_month": snapshot_month,
        "data": data,
        "created_by": created_by,
        **metrics,
    }
    res = (
        db.table("snapshots")
        .upsert(payload, on_conflict="group_id,snapshot_month")
        .execute()
    )
    return res.data[0]


def update_snapshot_by_id(snapshot_id: str, snapshot_month: str, data: dict, metrics: dict) -> dict:
    db = get_supabase()
    res = (
        db.table("snapshots")
        .update({"snapshot_month": snapshot_month, "data": data, **metrics})
        .eq("id", snapshot_id)
        .execute()
    )
    if not res.data:
        raise ValueError(f"snapshot {snapshot_id} not found after update")
    return res.data[0]


def delete_snapshot(snapshot_id: str) -> None:
    db = get_supabase()
    db.table("snapshots").delete().eq("id", snapshot_id).execute()


def get_prev_snapshot_data(group_id: str, before_month: str) -> dict | None:
    """직전 스냅샷 data 반환 (신규 스냅샷 폼 초기화용)."""
    db = get_supabase()
    res = (
        db.table("snapshots")
        .select("data")
        .eq("group_id", group_id)
        .lt("snapshot_month", before_month)
        .order("snapshot_month", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0]["data"] if res.data else None
