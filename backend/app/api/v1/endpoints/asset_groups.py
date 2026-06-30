from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.models.asset_group import (
    AssetGroupCreate, AssetGroupUpdate, AssetGroupResponse,
    MemberInvite, MemberRoleUpdate, MemberResponse,
    OwnershipTransferRequest,
)
from app.db import supabase as db

router = APIRouter()


def _require_role(group_id: str, user_id: str, *allowed: str) -> None:
    role = db.get_member_role(group_id, user_id)
    if role not in allowed:
        raise HTTPException(status_code=403, detail="권한 없음")


# ── Asset Groups ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AssetGroupResponse])
def list_groups(user_id: str = Depends(get_current_user)):
    return db.get_groups_for_user(user_id)


@router.post("/", response_model=AssetGroupResponse, status_code=201)
def create_group(body: AssetGroupCreate, user_id: str = Depends(get_current_user)):
    return db.create_group(body.name, user_id)


@router.get("/{group_id}", response_model=AssetGroupResponse)
def get_group(group_id: str, user_id: str = Depends(get_current_user)):
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    row = db.get_group(group_id)
    if not row:
        raise HTTPException(status_code=404, detail="장부 없음")
    return row


@router.put("/{group_id}", response_model=AssetGroupResponse)
def update_group(group_id: str, body: AssetGroupUpdate, user_id: str = Depends(get_current_user)):
    _require_role(group_id, user_id, "owner")
    row = db.update_group(group_id, body.name)
    if not row:
        raise HTTPException(status_code=404, detail="장부 없음")
    return row


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str, user_id: str = Depends(get_current_user)):
    _require_role(group_id, user_id, "owner")
    db.delete_group(group_id)


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(group_id: str, user_id: str = Depends(get_current_user)):
    _require_role(group_id, user_id, "owner", "editor", "viewer")
    rows = db.get_members(group_id)
    return [_flatten_member(r) for r in rows]


@router.post("/{group_id}/members", response_model=MemberResponse, status_code=201)
def invite_member(group_id: str, body: MemberInvite, user_id: str = Depends(get_current_user)):
    _require_role(group_id, user_id, "owner")
    if body.role not in ("owner", "editor", "viewer"):
        raise HTTPException(status_code=400, detail="role은 owner/editor/viewer 중 하나")
    target_user_id = db.get_user_id_by_email(body.email)
    if not target_user_id:
        raise HTTPException(status_code=404, detail="해당 이메일의 사용자를 찾을 수 없습니다.")
    return db.add_member(group_id, target_user_id, body.role)


@router.put("/{group_id}/members/{target_user_id}", response_model=MemberResponse)
def update_member(
    group_id: str, target_user_id: str, body: MemberRoleUpdate,
    user_id: str = Depends(get_current_user),
):
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
    user_id: str = Depends(get_current_user),
):
    _require_role(group_id, user_id, "owner")
    db.remove_member(group_id, target_user_id)


@router.post("/{group_id}/transfer-ownership", status_code=204)
def transfer_ownership_endpoint(
    group_id: str,
    body: OwnershipTransferRequest,
    user_id: str = Depends(get_current_user),
):
    _require_role(group_id, user_id, "owner")
    try:
        db.transfer_ownership(group_id, body.target_user_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _flatten_member(row: dict) -> dict:
    return row
