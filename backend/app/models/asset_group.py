from pydantic import BaseModel
from datetime import datetime


class AssetGroupCreate(BaseModel):
    name: str
    type: str = "personal"   # "personal" | "group"


class AssetGroupUpdate(BaseModel):
    name: str


class AssetGroupResponse(BaseModel):
    id: str
    name: str
    type: str
    created_by: str
    created_at: datetime
    role: str | None = None  # 현재 유저의 역할 (목록 조회 시 포함)


class MemberResponse(BaseModel):
    group_id: str
    user_id: str
    role: str
    joined_at: datetime
    display_name: str | None = None


class MemberInvite(BaseModel):
    email: str
    role: str = "editor"


class MemberRoleUpdate(BaseModel):
    role: str
