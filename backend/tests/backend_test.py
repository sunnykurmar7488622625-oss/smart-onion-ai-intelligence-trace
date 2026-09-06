"""
ONIONAI backend regression tests
Covers: health/auth, dashboard, batches, verify (public), storage,
inspections analyze+save (with a synthetic real image), reports (JSON + PDF),
buyer role restrictions, dispatch flow on a NEWLY created batch.
"""
import base64
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://smart-onion-trace.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

FARMER_EMAIL = "sunnykurmar7488622625@gmail.com"
FARMER_PW = "Onion@2026"
BUYER_EMAIL = "buyer@onionai.demo"
BUYER_PW = "Buyer@2026"


def _real_jpeg_b64():
    """Generate a small JPEG with real visual features (colored circles on light bg)."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (400, 300), (230, 220, 200))
    d = ImageDraw.Draw(img)
    circles = [
        (60, 60, 130, 130, (180, 70, 40)),
        (200, 80, 270, 150, (200, 90, 50)),
        (100, 180, 170, 250, (150, 50, 30)),
        (250, 190, 320, 260, (190, 80, 45)),
    ]
    for x1, y1, x2, y2, c in circles:
        d.ellipse([x1, y1, x2, y2], fill=c, outline=(80, 30, 10))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="session")
def farmer_token():
    r = requests.post(f"{API}/auth/login", json={"email": FARMER_EMAIL, "password": FARMER_PW}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def buyer_token():
    r = requests.post(f"{API}/auth/login", json={"email": BUYER_EMAIL, "password": BUYER_PW}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def farmer_h(farmer_token):
    return {"Authorization": f"Bearer {farmer_token}"}


@pytest.fixture
def buyer_h(buyer_token):
    return {"Authorization": f"Bearer {buyer_token}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": FARMER_EMAIL, "password": "wrongXX"}, timeout=15)
        assert r.status_code == 401

    def test_me_farmer(self, farmer_h):
        r = requests.get(f"{API}/auth/me", headers=farmer_h, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == FARMER_EMAIL
        assert u["role"] == "farmer"

    def test_me_buyer(self, buyer_h):
        r = requests.get(f"{API}/auth/me", headers=buyer_h, timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "buyer"

    def test_register_new_farmer(self):
        email = f"testfarmer_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(
            f"{API}/auth/register",
            json={"name": "Test Farmer", "email": email, "password": "Onion@2026", "role": "farmer"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == email

    def test_unauth_protected(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# --------------- DASHBOARD & BATCHES ---------------
class TestDashboard:
    def test_stats(self, farmer_h):
        r = requests.get(f"{API}/dashboard/stats", headers=farmer_h, timeout=15)
        assert r.status_code == 200
        s = r.json()
        t = s.get("totals", s)
        for k in ["total_batches", "grade_a", "urs", "defective"]:
            assert k in t, f"missing {k} in {list(t.keys())}"

    def test_list_batches_farmer(self, farmer_h):
        r = requests.get(f"{API}/batches", headers=farmer_h, timeout=15)
        assert r.status_code == 200
        ids = [b["batch_id"] for b in r.json()]
        for demo in ["ON-2026-001", "ON-2026-002", "ON-2026-003"]:
            assert demo in ids

    def test_list_batches_buyer_hides_uninspected(self, buyer_h):
        r = requests.get(f"{API}/batches", headers=buyer_h, timeout=15)
        assert r.status_code == 200
        ids = [b["batch_id"] for b in r.json()]
        assert "ON-2026-003" not in ids  # uninspected hidden for buyer


# --------------- PUBLIC VERIFY ---------------
class TestVerify:
    def test_verify_known(self):
        r = requests.get(f"{API}/verify/ON-2026-001", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["verified"] is True
        assert j["batch_id"] == "ON-2026-001"
        assert "verification_id" in j
        assert isinstance(j.get("storage_history", []), list)

    def test_verify_by_verification_id(self):
        r1 = requests.get(f"{API}/verify/ON-2026-001", timeout=15).json()
        vid = r1["verification_id"]
        r = requests.get(f"{API}/verify/{vid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["batch_id"] == "ON-2026-001"

    def test_verify_uninspected_404(self):
        r = requests.get(f"{API}/verify/ON-2026-003", timeout=15)
        assert r.status_code == 404

    def test_verify_unknown_404(self):
        r = requests.get(f"{API}/verify/NOPE-XXX", timeout=15)
        assert r.status_code == 404


# --------------- STORAGE ---------------
class TestStorage:
    def test_get_storage_trend(self, farmer_h):
        r = requests.get(f"{API}/storage/ON-2026-001", headers=farmer_h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j.get("trend"), list)
        assert len(j["trend"]) >= 3
        assert "alert" in j

    def test_add_storage_note(self, farmer_h):
        r = requests.post(
            f"{API}/storage/ON-2026-001",
            headers=farmer_h,
            json={"notes": f"TEST_note_{uuid.uuid4().hex[:6]}"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text


# --------------- REPORTS ---------------
class TestReports:
    def test_report_json(self, farmer_h):
        r = requests.get(f"{API}/reports/ON-2026-001", headers=farmer_h, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["batch_id"] == "ON-2026-001"
        assert "verification_id" in j

    def test_report_pdf(self, farmer_h):
        r = requests.get(f"{API}/reports/ON-2026-001/pdf", headers=farmer_h, timeout=30)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert r.content[:4] == b"%PDF"


# --------------- BUYER RESTRICTIONS ---------------
class TestBuyerForbidden:
    def test_buyer_cannot_create_batch(self, buyer_h):
        r = requests.post(
            f"{API}/batches",
            headers=buyer_h,
            json={"quantity": 100, "procurement_center": "Test"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_buyer_cannot_analyze(self, buyer_h):
        r = requests.post(
            f"{API}/inspections/analyze",
            headers=buyer_h,
            json={"images": [_real_jpeg_b64()], "source": "IMAGE_UPLOAD"},
            timeout=30,
        )
        assert r.status_code == 403


# --------------- INSPECTION ANALYZE (real - LIMITED) ---------------
class TestInspectionFlow:
    """One analyze call - creates a new batch, analyzes, saves, verifies dispatch."""

    def test_analyze_invalid_image(self, farmer_h):
        r = requests.post(
            f"{API}/inspections/analyze",
            headers=farmer_h,
            json={"images": ["data:image/jpeg;base64,not-a-real-image"], "source": "IMAGE_UPLOAD"},
            timeout=30,
        )
        assert r.status_code == 400

    def test_full_flow_new_batch_analyze_save_dispatch(self, farmer_h):
        # 1) create new batch
        r = requests.post(
            f"{API}/batches",
            headers=farmer_h,
            json={"quantity": 500, "procurement_center": "TEST Center", "variety": "Nashik Red", "supplier_name": "TEST Supplier"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        batch = r.json()
        batch_id = batch["batch_id"]
        assert batch_id.startswith("ON-")

        # 2) analyze (uses AI credits – single call)
        r = requests.post(
            f"{API}/inspections/analyze",
            headers=farmer_h,
            json={"images": [_real_jpeg_b64()], "source": "IMAGE_UPLOAD"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        an = r.json()
        assert "analysis_id" in an
        assert "overall_status" in an
        assert an["overall_status"] in ("PASS", "REVIEW REQUIRED", "LOW QUALITY")

        # 3) save inspection
        r = requests.post(
            f"{API}/inspections",
            headers=farmer_h,
            json={"analysis_id": an["analysis_id"], "batch_id": batch_id},
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        insp = r.json()
        assert insp["batch_id"] == batch_id
        assert insp["inspection_day"] == 1
        insp_id = insp["id"]

        # 4) verify inspection (human verified)
        r = requests.put(
            f"{API}/inspections/{insp_id}/verify",
            headers=farmer_h,
            json={"status": "VERIFIED"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("verification_status") in ("VERIFIED", "Human Verified", "verified")

        # 5) dispatch verify -> APPROVED
        r = requests.post(
            f"{API}/dispatch/{batch_id}/verify",
            headers=farmer_h,
            json={"status": "APPROVED"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text

        # 6) dispatch complete
        r = requests.post(f"{API}/dispatch/{batch_id}/complete", headers=farmer_h, timeout=15)
        assert r.status_code in (200, 201), r.text

        # 7) public verify now finds it
        r = requests.get(f"{API}/verify/{batch_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["verified"] is True
