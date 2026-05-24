"""Backend tests for the new Calendar and Habits panels in MyBoard.

These tests exercise the generic /api/data/<listName> endpoints used by the
new calendar and habits panels, plus auth and persistence.
"""
import json
import os
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


# ─── Auth / Registration ─────────────────────────────────────────────────────
class TestAuth:
    def test_login_existing_user(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/login", json={"username": "testuser1", "password": "pass1234"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["username"] == "testuser1"
        assert isinstance(data["token"], str) and len(data["token"]) > 10

    def test_login_wrong_password(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/login", json={"username": "testuser1", "password": "WRONG"})
        assert r.status_code in (400, 401, 403)

    def test_register_new_user(self, api_client, base_url):
        uname = f"TESTreg_{int(time.time()*1000)}"
        r = api_client.post(f"{base_url}/api/register", json={"username": uname, "password": "pass1234"})
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert "token" in data
        assert data["username"] == uname

    def test_data_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/data")
        assert r.status_code in (401, 403)


# ─── GET /api/data baseline ──────────────────────────────────────────────────
class TestDataBaseline:
    def test_get_data_returns_lists_and_tasks(self, api_client, base_url, fresh_headers):
        r = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "lists" in data
        assert "tasks" in data
        assert isinstance(data["lists"], dict)
        assert isinstance(data["tasks"], list)


# ─── Calendar panel ──────────────────────────────────────────────────────────
class TestCalendarPanel:
    def test_create_calendar_event(self, api_client, base_url, fresh_headers):
        extra = json.dumps({"date": "2026-01-15", "time": "09:30", "desc": "Team standup", "color": "sage"})
        r = api_client.post(
            f"{base_url}/api/data/calendar",
            headers=fresh_headers,
            json={"content": "Team meeting", "extra": extra},
        )
        assert r.status_code == 200, r.text
        assert "id" in r.json()
        item_id = r.json()["id"]
        assert isinstance(item_id, int) and item_id > 0

        # Verify persistence in GET /api/data
        r2 = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        assert r2.status_code == 200
        lists = r2.json()["lists"]
        assert "calendar" in lists, f"calendar list missing from GET /api/data. Got: {list(lists.keys())}"
        found = [x for x in lists["calendar"] if x["id"] == item_id]
        assert len(found) == 1
        ev = found[0]
        assert ev["value"] == "Team meeting"
        parsed = json.loads(ev["extra"])
        assert parsed["date"] == "2026-01-15"
        assert parsed["color"] == "sage"

    def test_empty_content_rejected(self, api_client, base_url, fresh_headers):
        r = api_client.post(
            f"{base_url}/api/data/calendar",
            headers=fresh_headers,
            json={"content": "   ", "extra": "{}"},
        )
        assert r.status_code == 400

    def test_update_calendar_event(self, api_client, base_url, fresh_headers):
        extra = json.dumps({"date": "2026-02-01", "time": "10:00", "desc": "", "color": "ink"})
        c = api_client.post(f"{base_url}/api/data/calendar", headers=fresh_headers,
                            json={"content": "Old title", "extra": extra})
        assert c.status_code == 200
        item_id = c.json()["id"]

        new_extra = json.dumps({"date": "2026-02-02", "time": "11:00", "desc": "edited", "color": "coral"})
        p = api_client.patch(f"{base_url}/api/data/item/{item_id}", headers=fresh_headers,
                             json={"content": "New title", "extra": new_extra})
        assert p.status_code == 200, p.text

        # Verify via GET
        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        items = [x for x in g.json()["lists"].get("calendar", []) if x["id"] == item_id]
        assert len(items) == 1
        assert items[0]["value"] == "New title"
        parsed = json.loads(items[0]["extra"])
        assert parsed["color"] == "coral"
        assert parsed["desc"] == "edited"

    def test_delete_calendar_event(self, api_client, base_url, fresh_headers):
        c = api_client.post(f"{base_url}/api/data/calendar", headers=fresh_headers,
                            json={"content": "ToDelete", "extra": "{}"})
        assert c.status_code == 200
        item_id = c.json()["id"]

        d = api_client.delete(f"{base_url}/api/data/item/{item_id}", headers=fresh_headers)
        assert d.status_code == 200

        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        items = [x for x in g.json()["lists"].get("calendar", []) if x["id"] == item_id]
        assert items == []

    def test_reset_calendar_list(self, api_client, base_url, fresh_headers):
        # Add two events
        for i in range(2):
            api_client.post(f"{base_url}/api/data/calendar", headers=fresh_headers,
                            json={"content": f"Ev{i}", "extra": "{}"})
        d = api_client.delete(f"{base_url}/api/data/calendar", headers=fresh_headers)
        assert d.status_code == 200
        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        cal = g.json()["lists"].get("calendar", [])
        assert cal == [] or len(cal) == 0


# ─── Habits panel ────────────────────────────────────────────────────────────
class TestHabitsPanel:
    def test_create_habit(self, api_client, base_url, fresh_headers):
        extra = json.dumps({"category": "health", "target": 7, "reminder": "08:00", "goal": "Stay healthy", "completions": []})
        r = api_client.post(
            f"{base_url}/api/data/habits",
            headers=fresh_headers,
            json={"content": "Drink water", "extra": extra},
        )
        assert r.status_code == 200, r.text
        item_id = r.json()["id"]

        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        habits = g.json()["lists"].get("habits", [])
        assert any(h["id"] == item_id for h in habits)
        h = [x for x in habits if x["id"] == item_id][0]
        assert h["value"] == "Drink water"
        parsed = json.loads(h["extra"])
        assert parsed["category"] == "health"
        assert parsed["target"] == 7
        assert parsed["completions"] == []

    def test_toggle_completion_persists(self, api_client, base_url, fresh_headers):
        extra = json.dumps({"category": "", "target": 7, "reminder": "", "goal": "", "completions": []})
        r = api_client.post(f"{base_url}/api/data/habits", headers=fresh_headers,
                            json={"content": "Read book", "extra": extra})
        item_id = r.json()["id"]

        today = "2026-01-20"
        new_extra = json.dumps({"category": "", "target": 7, "reminder": "", "goal": "", "completions": [today]})
        p = api_client.patch(f"{base_url}/api/data/item/{item_id}", headers=fresh_headers,
                             json={"extra": new_extra})
        assert p.status_code == 200

        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        h = [x for x in g.json()["lists"]["habits"] if x["id"] == item_id][0]
        parsed = json.loads(h["extra"])
        assert today in parsed["completions"]

    def test_delete_habit(self, api_client, base_url, fresh_headers):
        r = api_client.post(f"{base_url}/api/data/habits", headers=fresh_headers,
                            json={"content": "ToDel", "extra": "{}"})
        item_id = r.json()["id"]
        d = api_client.delete(f"{base_url}/api/data/item/{item_id}", headers=fresh_headers)
        assert d.status_code == 200
        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        assert not any(h["id"] == item_id for h in g.json()["lists"].get("habits", []))

    def test_reset_habits_list(self, api_client, base_url, fresh_headers):
        for i in range(2):
            api_client.post(f"{base_url}/api/data/habits", headers=fresh_headers,
                            json={"content": f"H{i}", "extra": "{}"})
        d = api_client.delete(f"{base_url}/api/data/habits", headers=fresh_headers)
        assert d.status_code == 200
        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        assert g.json()["lists"].get("habits", []) == []


# ─── Cross-user isolation ────────────────────────────────────────────────────
class TestIsolation:
    def test_cannot_modify_other_users_item(self, api_client, base_url, fresh_headers):
        # create item with fresh user
        c = api_client.post(f"{base_url}/api/data/calendar", headers=fresh_headers,
                            json={"content": "Mine", "extra": "{}"})
        item_id = c.json()["id"]

        # Register another user
        uname = f"TESTother_{int(time.time()*1000)}"
        r = api_client.post(f"{base_url}/api/register", json={"username": uname, "password": "pass1234"})
        other_token = r.json()["token"]
        other_headers = {"Content-Type": "application/json", "Authorization": f"Bearer {other_token}"}

        # Other user should not be able to delete/patch
        d = api_client.delete(f"{base_url}/api/data/item/{item_id}", headers=other_headers)
        assert d.status_code == 403

        p = api_client.patch(f"{base_url}/api/data/item/{item_id}", headers=other_headers,
                             json={"content": "hacked"})
        assert p.status_code == 403


# ─── Persistence after a full round trip ─────────────────────────────────────
class TestPersistence:
    def test_calendar_and_habits_persist_across_requests(self, api_client, base_url, fresh_headers):
        api_client.post(f"{base_url}/api/data/calendar", headers=fresh_headers,
                        json={"content": "Persist event",
                              "extra": json.dumps({"date": "2026-03-01", "time": "12:00", "desc": "x", "color": "amber"})})
        api_client.post(f"{base_url}/api/data/habits", headers=fresh_headers,
                        json={"content": "Persist habit",
                              "extra": json.dumps({"category": "work", "target": 5, "reminder": "", "goal": "", "completions": []})})

        g = api_client.get(f"{base_url}/api/data", headers=fresh_headers)
        lists = g.json()["lists"]
        assert any(x["value"] == "Persist event" for x in lists.get("calendar", []))
        assert any(x["value"] == "Persist habit" for x in lists.get("habits", []))
