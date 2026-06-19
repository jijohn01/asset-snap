from fastapi import APIRouter, Header, HTTPException
from app.models.asset_group import (
    AssetGroupCreate, AssetGroupUpdate, AssetGroupResponse,
    MemberInvite, MemberRoleUpdate, MemberResponse,
)
from app.db import supabase as db

router = APIRouter()

# ---------------------------------------------------------------------------
# Auth helper — issue #3에서 Supabase JWT 검증으로 교체 예정
# ---------------------------------------------------------------------------
def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID 헤더 필요")
    return x_user_id


def _require_role(group_id: str, user_id: str, *allowed: str) -> None:
    role = db.get_member_role(group_id, user_id)
    if role not in allowed:
        raise HTTPException(status_code=403, detail="권한 없음")


# ── Asset Groups ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AssetGroupResponse])
def list_groups(x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    return db.get_groups_for_user(user_id)


@router.post("/", response_model=AssetGroupResponse, status_code=201)
def create_group(body: AssetGroupCreate, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    if body.type not in ("personal", "group"):
        raise HTTPException(status_code=400, detail="type은 personal 또는 group")
    return db.create_group(body.name, body.type, user_id)


@router.get("/{group_id}", response_model=AssetGroupResponse)
def get_group(group_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    row = db.get_group(group_id)
    if not row:
        raise HTTPException(status_code=404, detail="장부 없음")
    return row


@router.put("/{group_id}", response_model=AssetGroupResponse)
def update_group(group_id: str, body: AssetGroupUpdate, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner")
    row = db.update_group(group_id, body.name)
    if not row:
        raise HTTPException(status_code=404, detail="장부 없음")
    return row


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner")
    db.delete_group(group_id)


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(group_id: str, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    rows = db.get_members(group_id)
    return [_flatten_member(r) for r in rows]


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=201)
def invite_member(group_id: str, body: MemberInvite, x_user_id: str | None = Header(default=None)):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner")
    if body.role not in ("owner", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="role은 owner/editor/viewer 중 하나")
    return db.add_member(group_id, body.user_id, body.role)


@router.put("/{group_id}/members/{target_user_id}", response_model=MemberResponse)
def update_member(
    group_id: str, target_user_id: str, body: MemberRoleUpdate,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner")
    if body.role not in ("owner", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="role은 owner/editor/viewer 중 하나")
    row = db.update_member_role(group_id, target_user_id, body.role)
    if not row:
        raise HTTPException(status_code=404, detail="멤버 없음")
    return row


@router.delete("/{group_id}/members/{target_user_id}", status_code=204)
def remove_member(
    group_id: str, target_user_id: str,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_user(x_user_id)
    _require_role(group_id, user_id, "owner")
    db.remove_member(group_id, target_user_id)


def _flatten_member(row: dict) -> dict:
    profiles = row.pop("profiles", None)
    row["display_name"] = profiles["display_name"] if profiles else None
    return row
