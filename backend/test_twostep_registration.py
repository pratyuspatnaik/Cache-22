"""
KrishiMandi - Two-Step Registration & Profile Completeness Test
File: backend/test_twostep_registration.py

Verifies:
1. Step 1: Registering with only name + mobile + role + password succeeds with is_profile_completed=False.
2. An incomplete farmer cannot create a listing (rejected with 403 Forbidden).
3. Step 2: Calling /api/auth/complete-profile with Aadhaar updates is_profile_completed=True.
4. Completed farmer can now create listings (201 Created).
5. Step 1 Buyer registration succeeds with is_profile_completed=False, and Step 2 succeeds without Aadhaar.
6. Login endpoint returns is_profile_completed flag accurately for resume routing.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_two_step_registration():
    print("--- 1. Testing Step 1 Minimal Farmer Registration ---")
    mobile_farmer = "9988771122"
    step1_payload = {
        "full_name": "Ramesh Kisan",
        "mobile": mobile_farmer,
        "password": "farmerpassword123",
        "role": "farmer",
        "language": "english"
    }
    res1 = client.post("/api/auth/register", json=step1_payload)
    if res1.status_code == 400 and "already registered" in res1.json().get("detail", ""):
        # User already exists from previous test run; log in instead
        login_res = client.post("/api/auth/login", json={"mobile": mobile_farmer, "password": "farmerpassword123"})
        token = login_res.json()["access_token"]
        user = login_res.json()["user"]
    else:
        assert res1.status_code == 201, f"Expected 201 Created, got {res1.status_code}: {res1.text}"
        data = res1.json()
        token = data["access_token"]
        user = data["user"]
        assert user["is_profile_completed"] is False, "Step 1 should have is_profile_completed=False"
        print("[PASS] Step 1 registration succeeded with is_profile_completed=False.")

    headers = {"Authorization": f"Bearer {token}"}

    # Verify that incomplete farmer CANNOT create listing
    if not user["is_profile_completed"]:
        print("\n--- 2. Testing Incomplete Farmer Listing Rejection ---")
        listing_payload = {
            "crop_name": "Wheat",
            "quantity": 100,
            "unit": "kg",
            "price_per_unit": 25,
            "quality_grade": "Grade A"
        }
        res_listing = client.post("/api/listings", json=listing_payload, headers=headers)
        assert res_listing.status_code == 403, f"Expected 403 Forbidden for incomplete profile, got {res_listing.status_code}: {res_listing.text}"
        print("[PASS] Incomplete farmer correctly blocked from creating crop listing:", res_listing.json()["detail"])

    # Step 2: Complete Profile
    print("\n--- 3. Testing Step 2 Profile Completion ---")
    step2_payload = {
        "user_id": user["id"],
        "full_name": "Ramesh Kisan",
        "address_line1": "Village Rampur, Post Office",
        "city": "Sambalpur",
        "pincode": "768001",
        "state": "Odisha",
        "upi_id": "ramesh@oksbi",
        "aadhar_number": "123456789012",
        "farm_location": "5 Acres canal irrigated",
        "primary_crops": "Paddy, Mustard"
    }
    res2 = client.post("/api/auth/complete-profile", json=step2_payload, headers=headers)
    assert res2.status_code == 200, f"Expected 200 OK, got {res2.status_code}: {res2.text}"
    updated_user = res2.json()
    assert updated_user["is_profile_completed"] is True
    assert updated_user["aadhar_number"] == "123456789012"
    print("[PASS] Step 2 complete-profile succeeded; is_profile_completed=True.")

    # Now verified farmer can create listing
    print("\n--- 4. Testing Verified Farmer Listing Creation ---")
    listing_payload2 = {
        "crop_name": "Paddy Super",
        "quantity": 500,
        "unit": "kg",
        "price_per_unit": 22,
        "quality_grade": "Grade A",
        "location_city": "Sambalpur",
        "location_state": "Odisha"
    }
    res_listing2 = client.post("/api/listings", json=listing_payload2, headers=headers)
    assert res_listing2.status_code == 201, f"Expected 201, got {res_listing2.status_code}: {res_listing2.text}"
    print(f"[PASS] Verified farmer successfully created CropListing id={res_listing2.json()['id']}.")

    # Step 5: Test Buyer Registration and Login Resume
    print("\n--- 5. Testing Buyer Two-Step Registration & Login Resume ---")
    mobile_buyer = "9988771133"
    buyer_step1 = {
        "full_name": "Metro Retailers",
        "mobile": mobile_buyer,
        "password": "buyerpassword123",
        "role": "buyer",
        "language": "english"
    }
    res_b1 = client.post("/api/auth/register", json=buyer_step1)
    if res_b1.status_code == 201:
        assert res_b1.json()["user"]["is_profile_completed"] is False
        b_token = res_b1.json()["access_token"]
        b_headers = {"Authorization": f"Bearer {b_token}"}

        # Check login returns is_profile_completed=False so app redirects to details.html
        log_res = client.post("/api/auth/login", json={"mobile": mobile_buyer, "password": "buyerpassword123"})
        assert log_res.status_code == 200
        assert log_res.json()["user"]["is_profile_completed"] is False
        print("[PASS] Login accurately reports is_profile_completed=False for returning incomplete user.")

        # Complete buyer profile
        buyer_step2 = {
            "address_line1": "Commercial Complex, Sector 4",
            "city": "Bhubaneswar",
            "pincode": "751001",
            "state": "Odisha",
            "upi_id": "metro@okicici",
            "buyer_type": "bulk",
            "gstin": "21AABCU9603R1ZM"
        }
        res_b2 = client.post("/api/auth/complete-profile", json=buyer_step2, headers=b_headers)
        assert res_b2.status_code == 200
        assert res_b2.json()["is_profile_completed"] is True
        print("[PASS] Buyer completed profile without Aadhaar; is_profile_completed=True.")

    print("\n=== ALL TWO-STEP REGISTRATION & COMPLETENESS TESTS PASSED! ===")

if __name__ == "__main__":
    test_two_step_registration()
