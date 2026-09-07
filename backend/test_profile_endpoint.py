"""
Test script to test registration, login, profile retrieval (/api/auth/me),
and profile update (/api/auth/profile) using FastAPI TestClient.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
from app.database import init_db

def test_profile_lifecycle():
    init_db()
    with TestClient(app) as client:
        import random
        rand_phone = f"98765{random.randint(10000, 99999)}"
    
    # 1. Register a test user with custom full_name
    reg_resp = client.post("/api/auth/register", json={
        "full_name": "Suresh Kumar",
        "mobile": rand_phone,
        "password": "Password123!",
        "language": "english",
        "role": "farmer"
    })
    assert reg_resp.status_code == 201, f"Register failed: {reg_resp.text}"
    data = reg_resp.json()
    assert data["user"]["full_name"] == "Suresh Kumar"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get current profile
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200, f"Get profile failed: {me_resp.text}"
    user = me_resp.json()
    assert user["full_name"] == "Suresh Kumar"
    assert user["mobile_number"] == rand_phone
    
    # 3. Update profile fields (Full Name, Address, UPI)
    update_resp = client.put("/api/auth/profile", headers=headers, json={
        "full_name": "Ramesh Patil",
        "language_preference": "hindi",
        "address_line1": "Farm Plot 44, Post Office Road",
        "address_line2": "Nashik Rural",
        "city": "Nashik",
        "pincode": "422003",
        "state": "Maharashtra",
        "upi_id": "ramesh@upi"
    })
    assert update_resp.status_code == 200, f"Update profile failed: {update_resp.text}"
    updated = update_resp.json()
    assert updated["full_name"] == "Ramesh Patil"
    assert updated["city"] == "Nashik"
    assert updated["upi_id"] == "ramesh@upi"
    assert updated["pincode"] == "422003"
    
    # 4. Fetch me again to confirm persistence in DB
    me_resp2 = client.get("/api/auth/me", headers=headers)
    assert me_resp2.status_code == 200
    user2 = me_resp2.json()
    assert user2["full_name"] == "Ramesh Patil"
    assert user2["city"] == "Nashik"
    assert user2["upi_id"] == "ramesh@upi"
    
    print("[SUCCESS] Full Profile CRUD & Persistence verified successfully!")

if __name__ == "__main__":
    test_profile_lifecycle()
