import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user


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
    assert len(update_calls) == 2
    assert update_calls[0][0][0] == {"role": "owner"}   # target gets owner first
    assert update_calls[1][0][0] == {"role": "editor"}  # caller gets editor second


CALLER_ID = "caller-uuid"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: CALLER_ID
    yield
    app.dependency_overrides.clear()


def test_endpoint_success(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "owner"
        mock_db.transfer_ownership.return_value = None
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 204


def test_endpoint_forbidden_non_owner(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "editor"
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 403


def test_endpoint_bad_request_not_member(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "owner"
        mock_db.transfer_ownership.side_effect = ValueError("not_member")
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "not_member"


def test_endpoint_requires_auth(client):
    response = client.post(
        "/api/v1/asset-groups/group-1/transfer-ownership",
        json={"target_user_id": "target-uuid"},
    )
    assert response.status_code in (401, 403)
