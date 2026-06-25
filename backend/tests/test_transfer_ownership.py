import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_supabase():
    with patch("app.db.supabase.get_supabase") as mock_get:
        mock_db = MagicMock()
        mock_get.return_value = mock_db
        yield mock_db


def _set_member_data(mock_db, data: list):
    """select().eq().eq().execute().data 체인 반환값 설정 헬퍼."""
    (
        mock_db.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .execute.return_value
        .data
    ) = data


def test_self_transfer_raises():
    from app.db.supabase import transfer_ownership
    with pytest.raises(ValueError, match="self_transfer"):
        transfer_ownership("group-1", "same-uuid", "same-uuid")


def test_not_member_raises(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [])
    with pytest.raises(ValueError, match="not_member"):
        transfer_ownership("group-1", "target-uuid", "caller-uuid")


def test_already_owner_raises(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [{"role": "owner"}])
    with pytest.raises(ValueError, match="already_owner"):
        transfer_ownership("group-1", "target-uuid", "caller-uuid")


def test_success_updates_both_roles(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [{"role": "editor"}])

    transfer_ownership("group-1", "target-uuid", "caller-uuid")

    update_calls = mock_supabase.table.return_value.update.call_args_list
    updated_roles = [c[0][0]["role"] for c in update_calls]
    assert "owner" in updated_roles
    assert "editor" in updated_roles
    assert len(updated_roles) == 2
