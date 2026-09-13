import sys
from pathlib import Path
import random

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_role_auth_and_crop_listings():
    rand_8 = random.randint(10000000, 99999999)
    farmer_mobile = f"98{rand_8}"[:10]
    buyer_mobile = f"88{rand_8}"[:10]

    # 1. Register a Farmer User
    farmer_reg_resp = client.post("/api/auth/register", json={
        "full_name": "Ramesh Patil",
        "mobile": farmer_mobile,
        "password": "FarmerPassword123!",
        "language": "english",
        "role": "farmer"
    })
    assert farmer_reg_resp.status_code == 201, f"Farmer registration failed: {farmer_reg_resp.text}"
    farmer_data = farmer_reg_resp.json()
    farmer_token = farmer_data["access_token"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}
    print("[PASS] Farmer registration successful with role='farmer'")

    # 2. Test Farmer Profile Completion requiring Aadhaar
    # Missing Aadhaar should fail with 400
    bad_completion = client.post("/api/auth/complete-profile", json={
        "address_line1": "Farm 42, Green Valley",
        "city": "Nashik",
        "pincode": "422001",
        "state": "Maharashtra",
        "upi_id": f"{farmer_mobile}@ybl",
        "aadhar_number": None
    }, headers=farmer_headers)
    assert bad_completion.status_code == 400, "Farmer profile completion without Aadhaar should fail"
    print("[PASS] Farmer profile completion without Aadhaar rejected as expected")

    # Valid Aadhaar should succeed
    good_completion = client.post("/api/auth/complete-profile", json={
        "address_line1": "Farm 42, Green Valley",
        "city": "Nashik",
        "pincode": "422001",
        "state": "Maharashtra",
        "upi_id": f"{farmer_mobile}@ybl",
        "aadhar_number": "123456789012",
        "farm_location": "Nashik Agri Belt, 15 Acres",
        "primary_crops": "Wheat, Onion, Tomato"
    }, headers=farmer_headers)
    assert good_completion.status_code == 200, f"Farmer profile completion failed: {good_completion.text}"
    completed_farmer = good_completion.json()
    assert completed_farmer["aadhar_number"] == "123456789012"
    assert completed_farmer["farm_location"] == "Nashik Agri Belt, 15 Acres"
    print("[PASS] Farmer profile completion with 12-digit Aadhaar passed")

    # 3. Register a Buyer User
    buyer_reg_resp = client.post("/api/auth/register", json={
        "full_name": "Metro Retailers Ltd",
        "mobile": buyer_mobile,
        "password": "BuyerPassword123!",
        "language": "english",
        "role": "buyer"
    })
    assert buyer_reg_resp.status_code == 201, f"Buyer registration failed: {buyer_reg_resp.text}"
    buyer_token = buyer_reg_resp.json()["access_token"]
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    print("[PASS] Buyer registration successful with role='buyer'")

    # 4. Buyer profile completion does NOT require Aadhaar
    buyer_completion = client.post("/api/auth/complete-profile", json={
        "address_line1": "Sector 18, Commercial Hub",
        "city": "Mumbai",
        "pincode": "400001",
        "state": "Maharashtra",
        "upi_id": f"{buyer_mobile}@icici",
        "buyer_type": "bulk",
        "gstin": "27AABCU9603R1ZM"
    }, headers=buyer_headers)
    assert buyer_completion.status_code == 200, f"Buyer profile completion failed: {buyer_completion.text}"
    completed_buyer = buyer_completion.json()
    assert completed_buyer["aadhar_number"] is None
    assert completed_buyer["buyer_type"] == "bulk"
    assert completed_buyer["gstin"] == "27AABCU9603R1ZM"
    print("[PASS] Buyer profile completed successfully without Aadhaar")

    # 5. Create Crop Listing as Farmer -> Expect 201 Created
    listing_resp = client.post("/api/listings", json={
        "crop_name": "Sharbati Wheat",
        "variety": "Golden Sharbati",
        "quantity": 150.0,
        "unit": "quintal",
        "price_per_unit": 2450.0,
        "quality_grade": "Grade A",
        "location_city": "Nashik",
        "location_state": "Maharashtra"
    }, headers=farmer_headers)
    assert listing_resp.status_code == 201, f"Crop listing creation failed: {listing_resp.text}"
    listing_data = listing_resp.json()
    listing_id = listing_data["id"]
    assert listing_data["crop_name"] == "Sharbati Wheat"
    assert listing_data["price_per_unit"] == 2450.0
    print(f"[PASS] Farmer created CropListing id={listing_id}")

    # 6. Attempt Crop Listing as Buyer -> Expect 403 Forbidden
    buyer_listing_resp = client.post("/api/listings", json={
        "crop_name": "Tomato",
        "quantity": 50.0,
        "unit": "quintal",
        "price_per_unit": 1200.0
    }, headers=buyer_headers)
    assert buyer_listing_resp.status_code == 403, "Buyer should not be allowed to post listings"
    print("[PASS] Unauthorized listing attempt by buyer correctly rejected with 403 Forbidden")

    # 7. Public GET /api/listings with filters
    search_resp = client.get("/api/listings?crop=Wheat&min_price=2000&max_price=3000")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data["total_count"] >= 1
    found = any(item["id"] == listing_id for item in search_data["items"])
    assert found, "Created listing should appear in filter search results"
    print("[PASS] Public GET /api/listings filter search returned the expected listing")

    # 8. Single Listing Detail GET /api/listings/{id} (Unauthenticated -> Masked Phone)
    detail_resp = client.get(f"/api/listings/{listing_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["farmer"]["full_name"] == "Ramesh Patil"
    unauth_phone = detail_data["farmer"]["mobile_number"]
    assert "XXXXXX" in unauth_phone, f"Expected masked phone number for unauthenticated user, got {unauth_phone}"
    print(f"[PASS] GET /api/listings/{{id}} unauthenticated -> mobile number is masked: {unauth_phone}")

    # 9. GET /api/listings/{id}?full=true without auth -> Expect 401 Unauthorized
    full_unauth_resp = client.get(f"/api/listings/{listing_id}?full=true")
    assert full_unauth_resp.status_code == 401
    print("[PASS] GET /api/listings/{id}?full=true unauthenticated -> rejected with 401 Unauthorized")

    # 10. GET /api/listings/{id}?full=true with authenticated buyer -> Full unmasked phone returned
    full_auth_resp = client.get(f"/api/listings/{listing_id}?full=true", headers=buyer_headers)
    assert full_auth_resp.status_code == 200
    full_data = full_auth_resp.json()
    auth_phone = full_data["farmer"]["mobile_number"]
    assert "XXXXXX" not in auth_phone, f"Expected unmasked phone for authenticated buyer, got {auth_phone}"
    assert auth_phone == farmer_mobile
    print(f"[PASS] GET /api/listings/{{id}} authenticated buyer -> full number returned: {auth_phone}")

    # 11. POST /api/listings with price_per_unit: -5 -> Rejected with 422
    neg_price_resp = client.post("/api/listings", json={
        "crop_name": "Wheat",
        "quantity": 10.0,
        "price_per_unit": -5.0
    }, headers=farmer_headers)
    assert neg_price_resp.status_code == 422
    print("[PASS] POST /api/listings with price_per_unit: -5 -> rejected with 422")

    # 12. POST /api/listings with quantity: 0 -> Rejected with 422
    zero_qty_resp = client.post("/api/listings", json={
        "crop_name": "Wheat",
        "quantity": 0.0,
        "price_per_unit": 2000.0
    }, headers=farmer_headers)
    assert zero_qty_resp.status_code == 422
    print("[PASS] POST /api/listings with quantity: 0 -> rejected with 422")

    # 13. Direct API call with invalid buyer_type: "smuggler" -> Rejected with 422
    invalid_buyer_resp = client.post("/api/auth/complete-profile", json={
        "address_line1": "Port Terminal",
        "city": "Mumbai",
        "pincode": "400001",
        "state": "Maharashtra",
        "upi_id": "buyer@upi",
        "buyer_type": "smuggler"
    }, headers=buyer_headers)
    assert invalid_buyer_resp.status_code == 422
    print("[PASS] Direct API call with buyer_type: 'smuggler' -> rejected with 422")

    # 14. Direct API call with invalid quality_grade: "Grade Z" -> Rejected with 422
    invalid_grade_resp = client.post("/api/listings", json={
        "crop_name": "Wheat",
        "quantity": 25.0,
        "price_per_unit": 2200.0,
        "quality_grade": "Grade Z"
    }, headers=farmer_headers)
    assert invalid_grade_resp.status_code == 422
    print("[PASS] Direct API call with quality_grade: 'Grade Z' -> rejected with 422")

    print("\n--- ALL ROLE AUTH, MIGRATION & HARDENING CHECKS PASSED PERFECTLY! ---")

if __name__ == "__main__":
    test_role_auth_and_crop_listings()

