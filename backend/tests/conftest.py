"""Pytest fixtures for MyBoard backend tests."""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to .env
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

TEST_USERNAME = "testuser1"
TEST_PASSWORD = "pass1234"


@pytest.fixture(scope="session")
def base_url():
    assert BASE_URL, "REACT_APP_BACKEND_URL not set"
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login_or_register(api_client, base_url, username, password):
    # Try login first
    r = api_client.post(f"{base_url}/api/login", json={"username": username, "password": password})
    if r.status_code == 200:
        return r.json()["token"]
    # Register
    r = api_client.post(f"{base_url}/api/register", json={"username": username, "password": password})
    if r.status_code in (200, 201):
        return r.json()["token"]
    pytest.skip(f"Cannot login or register {username}: {r.status_code} {r.text}")


@pytest.fixture(scope="session")
def auth_token(api_client, base_url):
    return _login_or_register(api_client, base_url, TEST_USERNAME, TEST_PASSWORD)


@pytest.fixture(scope="session")
def fresh_user_token(api_client, base_url):
    """Fresh user per test session to isolate from testuser1's state."""
    uname = f"TESTu_{int(time.time())}"
    r = api_client.post(f"{base_url}/api/register", json={"username": uname, "password": "pass1234"})
    if r.status_code not in (200, 201):
        pytest.skip(f"Could not register fresh user: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def fresh_headers(fresh_user_token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {fresh_user_token}"}
