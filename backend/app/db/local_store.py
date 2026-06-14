import json
import uuid
from datetime import datetime
from pathlib import Path

_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_DATA_DIR.mkdir(exist_ok=True)

_SNAPSHOTS = _DATA_DIR / "snapshots.json"
_USER_ITEMS = _DATA_DIR / "user_items.json"


def _read(path: Path) -> list:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, data: list) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


# ── Snapshots ────────────────────────────────────────────────────────────────

def get_all_snapshots() -> list[dict]:
    rows = _read(_SNAPSHOTS)
    return sorted(rows, key=lambda r: r["snapshot_month"], reverse=True)


def get_snapshot(snapshot_id: str) -> dict | None:
    return next((r for r in _read(_SNAPSHOTS) if r["id"] == snapshot_id), None)


def save_snapshot(row: dict) -> dict:
    rows = _read(_SNAPSHOTS)
    idx = next((i for i, r in enumerate(rows) if r["snapshot_month"] == row["snapshot_month"]), None)
    if idx is not None:
        row["id"] = rows[idx]["id"]
        row["created_at"] = rows[idx]["created_at"]
        rows[idx] = row
    else:
        row["id"] = str(uuid.uuid4())
        row["created_at"] = datetime.now().isoformat()
        rows.append(row)
    _write(_SNAPSHOTS, rows)
    return row


def delete_snapshot(snapshot_id: str) -> None:
    _write(_SNAPSHOTS, [r for r in _read(_SNAPSHOTS) if r["id"] != snapshot_id])


# ── User Items ────────────────────────────────────────────────────────────────

def get_all_items() -> list[dict]:
    items = _read(_USER_ITEMS)
    return sorted(items, key=lambda i: (i["category"], i["sort_order"]))


def save_item(item: dict) -> dict:
    items = _read(_USER_ITEMS)
    item["id"] = str(uuid.uuid4())
    items.append(item)
    _write(_USER_ITEMS, items)
    return item


def update_item(item_id: str, updates: dict) -> dict | None:
    items = _read(_USER_ITEMS)
    for i, item in enumerate(items):
        if item["id"] == item_id:
            items[i] = {**item, **updates}
            _write(_USER_ITEMS, items)
            return items[i]
    return None


def delete_item(item_id: str) -> None:
    _write(_USER_ITEMS, [i for i in _read(_USER_ITEMS) if i["id"] != item_id])
