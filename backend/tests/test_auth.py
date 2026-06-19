def test_asset_groups_requires_auth(client):
    response = client.get("/api/v1/asset-groups/")
    assert response.status_code in (401, 403)


def test_asset_groups_invalid_token(client):
    response = client.get(
        "/api/v1/asset-groups/",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert response.status_code == 401
