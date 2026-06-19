"""
기존 JSON 파일 데이터를 Supabase로 마이그레이션.

사용법:
  cd backend
  uv run python scripts/migrate_json.py --user-id <supabase-user-uuid>

  --user-id: Supabase에 이미 가입된 유저 UUID (trigger로 profiles + asset_groups 자동 생성됨)
  --dry-run: DB에 쓰지 않고 변환 결과만 출력
"""
import argparse
import json
import uuid
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings  # noqa: E402 (path must be set first)
from app.db.supabase import get_supabase, get_groups_for_user, upsert_snapshot
from app.services.calculations import calculate_metrics
from app.models.snapshot import SnapshotItem


DATA_DIR = Path(__file__).parent.parent / "data"


def load_user_items() -> dict[str, dict]:
    """user_items.json을 id → item dict으로 로드."""
    path = DATA_DIR / "user_items.json"
    if not path.exists():
        return {}
    items = json.loads(path.read_text(encoding="utf-8"))
    return {item["id"]: item for item in items}


def convert_snapshot(old: dict, user_items: dict[str, dict]) -> dict[str, dict]:
    """
    구 중첩 구조 → 새 flat JSONB 구조 변환.

    구조:
      old.data.assets.cash_savings.i01 = 1907
    →
      new["i01"] = { label, category, sort_order, memo, amount }
    """
    new_data: dict[str, dict] = {}
    old_data = old.get("data", {})

    for section, subcategories in old_data.items():          # assets, liabilities, ...
        for subcat, items in subcategories.items():           # cash_savings, ...
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, help="Supabase 유저 UUID")
    parser.add_argument("--dry-run", action="store_true", help="DB에 쓰지 않고 출력만")
    args = parser.parse_args()

    if not settings.supabase_url:
        print("ERROR: SUPABASE_URL 환경변수가 없습니다. backend/.env 확인")
        sys.exit(1)

    user_items = load_user_items()
    snapshots_path = DATA_DIR / "snapshots.json"
    if not snapshots_path.exists():
        print(f"ERROR: {snapshots_path} 없음")
        sys.exit(1)

    old_snapshots = json.loads(snapshots_path.read_text(encoding="utf-8"))

    # 유저의 기본 개인 장부 찾기 (trigger로 이미 생성됨)
    groups = get_groups_for_user(args.user_id)
    personal = next((g for g in groups if g["type"] == "personal"), None)
    if not personal:
        print("ERROR: 유저의 개인 장부를 찾을 수 없습니다. Supabase에 해당 유저가 가입했는지 확인하세요.")
        sys.exit(1)

    group_id = personal["id"]
    print(f"대상 장부: {personal['name']} (id={group_id})\n")

    for old in sorted(old_snapshots, key=lambda x: x["snapshot_month"]):
        month = old["snapshot_month"]
        new_data = convert_snapshot(old, user_items)
        parsed_data = {k: SnapshotItem(**v) for k, v in new_data.items()}
        metrics = calculate_metrics(parsed_data)

        print(f"  {month}: {len(new_data)}개 항목, 순자산={metrics.net_worth:,}만원")

        if not args.dry_run:
            upsert_snapshot(
                group_id=group_id,
                snapshot_month=month,
                data=new_data,
                metrics=metrics.model_dump(),
                created_by=args.user_id,
            )

    if args.dry_run:
        print("\n[dry-run] DB 반영 없음.")
    else:
        print(f"\n완료: {len(old_snapshots)}개 스냅샷 → Supabase 이관")


if __name__ == "__main__":
    main()
