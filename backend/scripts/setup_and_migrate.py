"""
1) Supabase 유저 목록 조회 (없으면 테스트 유저 생성)
2) 기존 JSON 데이터 → Supabase 이관
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.db.supabase import get_supabase, get_groups_for_user, upsert_snapshot
from app.services.calculations import calculate_metrics
from app.models.snapshot import SnapshotItem

DATA_DIR = Path(__file__).parent.parent / "data"
TEST_EMAIL = "test@assetnavigator.dev"
TEST_PASSWORD = "Test1234!!"


def get_or_create_user() -> str:
    db = get_supabase()

    # 기존 유저 목록 조회 (service role 권한)
    res = db.auth.admin.list_users()
    users = res if isinstance(res, list) else (res.users if hasattr(res, "users") else [])

    if users:
        user = users[0]
        uid = user.id if hasattr(user, "id") else user["id"]
        email = user.email if hasattr(user, "email") else user.get("email", "")
        print(f"Found user: {email} (id={uid})")
        return uid

    # 유저 없으면 생성
    print(f"No users found, creating: {TEST_EMAIL}")
    res = db.auth.admin.create_user({
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "email_confirm": True,
    })
    user = res.user if hasattr(res, "user") else res
    uid = user.id if hasattr(user, "id") else user["id"]
    print(f"User created (id={uid})")
    return uid


def load_user_items() -> dict[str, dict]:
    path = DATA_DIR / "user_items.json"
    if not path.exists():
        return {}
    return {item["id"]: item for item in json.loads(path.read_text(encoding="utf-8"))}


def convert_snapshot(old: dict, user_items: dict) -> dict:
    new_data: dict[str, dict] = {}
    for section, subcategories in old.get("data", {}).items():
        for subcat, items in subcategories.items():
            category = f"{section}.{subcat}"
            for item_id, amount in items.items():
                meta = user_items.get(item_id, {})
                new_data[item_id] = {
                    "label":      meta.get("label", item_id),
                    "category":   category,
                    "sort_order": meta.get("sort_order", 0),
                    "memo":       meta.get("memo", ""),
                    "amount":     amount,
                }
    return new_data


def main():
    if not settings.supabase_url:
        print("ERROR: SUPABASE_URL 없음. backend/.env 확인")
        sys.exit(1)

    user_id = get_or_create_user()

    # trigger로 장부가 자동 생성됐는지 확인
    groups = get_groups_for_user(user_id)
    personal = next((g for g in groups if g["type"] == "personal"), None)
    if not personal:
        print("ERROR: personal group not found. Check Supabase trigger.")
        sys.exit(1)

    group_id = personal["id"]
    print(f"Group: {personal['name']} (id={group_id})\n")

    user_items = load_user_items()
    old_snapshots = json.loads((DATA_DIR / "snapshots.json").read_text(encoding="utf-8"))

    for old in sorted(old_snapshots, key=lambda x: x["snapshot_month"]):
        month = old["snapshot_month"]
        new_data = convert_snapshot(old, user_items)
        parsed = {k: SnapshotItem(**v) for k, v in new_data.items()}
        metrics = calculate_metrics(parsed)

        upsert_snapshot(
            group_id=group_id,
            snapshot_month=month,
            data=new_data,
            metrics=metrics.model_dump(),
            created_by=user_id,
        )
        print(f"  OK {month}: {len(new_data)} items, net_worth={metrics.net_worth:,}")

    print(f"\nDone: {len(old_snapshots)} snapshots migrated")


if __name__ == "__main__":
    main()
