from fastapi import APIRouter, HTTPException
from app.models.snapshot import UserItem, UserItemCreate, UserItemUpdate
from app.db import local_store as store

router = APIRouter()


@router.get("/", response_model=list[UserItem])
def list_user_items():
    return store.get_all_items()


@router.post("/", response_model=UserItem, status_code=201)
def create_user_item(body: UserItemCreate):
    return store.save_item(body.model_dump())


@router.put("/{item_id}", response_model=UserItem)
def update_user_item(item_id: str, body: UserItemUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None or k == "memo"}
    item = store.update_item(item_id, updates)
    if not item:
        raise HTTPException(status_code=404, detail="항목 없음")
    return item


@router.delete("/{item_id}", status_code=204)
def delete_user_item(item_id: str):
    store.delete_item(item_id)
