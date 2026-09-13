"""
Database Seeder for KrishiMandi Marketplace.
Populates realistic produce listings and farmer accounts for demonstration and testing.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal, init_db
from app.models import User, CropListing
from app.security import get_password_hash

def seed_marketplace():
    init_db()
    db = SessionLocal()
    try:
        # Check or create verified farmer users
        farmers_data = [
            {
                "mobile_number": "9812345678",
                "full_name": "Ramesh Chandra Patel",
                "role": "farmer",
                "city": "Indore",
                "state": "Madhya Pradesh",
                "farm_location": "Sanwer Road, Indore",
                "primary_crops": "Sharbati Wheat, Soybeans",
                "aadhar_number": "123456789012"
            },
            {
                "mobile_number": "9823456789",
                "full_name": "Balwinder Singh Dhillon",
                "role": "farmer",
                "city": "Karnal",
                "state": "Haryana",
                "farm_location": "Taraori Belt, Karnal",
                "primary_crops": "Basmati Paddy, Mustard",
                "aadhar_number": "234567890123"
            },
            {
                "mobile_number": "9834567890",
                "full_name": "Dattatray Sopan Patil",
                "role": "farmer",
                "city": "Nashik",
                "state": "Maharashtra",
                "farm_location": "Lasalgaon Mandi, Nashik",
                "primary_crops": "Red Onion, Green Grapes",
                "aadhar_number": "345678901234"
            },
            {
                "mobile_number": "9845678901",
                "full_name": "Bijay Kumar Sahu",
                "role": "farmer",
                "city": "Sambalpur",
                "state": "Odisha",
                "farm_location": "Attabira Canal Zone, Sambalpur",
                "primary_crops": "Swarna Rice, Turmeric",
                "aadhar_number": "456789012345"
            },
            {
                "mobile_number": "9856789012",
                "full_name": "Subrat Narayan Jena",
                "role": "farmer",
                "city": "Cuttack",
                "state": "Odisha",
                "farm_location": "Banki Valley, Cuttack",
                "primary_crops": "Hybrid Tomato, Green Chili",
                "aadhar_number": "567890123456"
            }
        ]

        farmer_models = {}
        for fd in farmers_data:
            existing = db.query(User).filter(User.mobile_number == fd["mobile_number"]).first()
            if not existing:
                user = User(
                    mobile_number=fd["mobile_number"],
                    hashed_password=get_password_hash("Farmer@123"),
                    full_name=fd["full_name"],
                    role=fd["role"],
                    city=fd["city"],
                    state=fd["state"],
                    farm_location=fd["farm_location"],
                    primary_crops=fd["primary_crops"],
                    aadhar_number=fd["aadhar_number"],
                    is_active=True,
                    is_verified=True,
                    is_profile_completed=True
                )
                db.add(user)
                db.flush()
                farmer_models[fd["full_name"]] = user
            else:
                farmer_models[fd["full_name"]] = existing

        db.commit()

        # Seed realistic produce listings
        listings_data = [
            {
                "farmer": "Ramesh Chandra Patel",
                "crop_name": "Sharbati Wheat (शरबती गेहूँ)",
                "variety": "C-306 Golden Grain",
                "quality_grade": "Grade A",
                "quantity": 120.0,
                "unit": "quintal",
                "price_per_unit": 2750.0,
                "location_city": "Indore",
                "location_state": "Madhya Pradesh",
                "description": "Sun-dried golden Sharbati wheat from Malwa black soil. High gluten, optimal for rotis."
            },
            {
                "farmer": "Balwinder Singh Dhillon",
                "crop_name": "Pusa 1121 Basmati Rice (चावल / ଧାନ)",
                "variety": "Extra Long Slender 1121",
                "quality_grade": "Grade A",
                "quantity": 80.0,
                "unit": "quintal",
                "price_per_unit": 4200.0,
                "location_city": "Karnal",
                "location_state": "Haryana",
                "description": "Authentic aroma aged 1-year Taraori Basmati. Moisture under 12%."
            },
            {
                "farmer": "Dattatray Sopan Patil",
                "crop_name": "Nashik Red Onion (लाल प्याज / ନାଲି ପିଆଜ)",
                "variety": "Garwa Late Kharif",
                "quality_grade": "Grade A",
                "quantity": 250.0,
                "unit": "quintal",
                "price_per_unit": 1850.0,
                "location_city": "Nashik",
                "location_state": "Maharashtra",
                "description": "Export-quality firm bulbs from Lasalgaon, sorted 55mm+ diameter."
            },
            {
                "farmer": "Subrat Narayan Jena",
                "crop_name": "Hybrid Desi Tomato (टमाटर / ବିଲାତି)",
                "variety": "Abhinav F1",
                "quality_grade": "Grade B",
                "quantity": 60.0,
                "unit": "quintal",
                "price_per_unit": 1400.0,
                "location_city": "Cuttack",
                "location_state": "Odisha",
                "description": "Freshly harvested semi-ripe firm tomatoes, great shelf-life for wholesale traders."
            },
            {
                "farmer": "Bijay Kumar Sahu",
                "crop_name": "Swarna Paddy Rice (ସ୍ୱର୍ଣ୍ଣ ଧାନ)",
                "variety": "MTU 7029 Swarna",
                "quality_grade": "Grade B",
                "quantity": 150.0,
                "unit": "quintal",
                "price_per_unit": 2180.0,
                "location_city": "Sambalpur",
                "location_state": "Odisha",
                "description": "Hirakud canal irrigated paddy, cleaned and bagged in standard 50kg sacks."
            },
            {
                "farmer": "Ramesh Chandra Patel",
                "crop_name": "Yellow Soybeans (सोयाबीन)",
                "variety": "JS-9560 High Oil",
                "quality_grade": "Grade A",
                "quantity": 95.0,
                "unit": "quintal",
                "price_per_unit": 4650.0,
                "location_city": "Indore",
                "location_state": "Madhya Pradesh",
                "description": "Oil content >18.5%, machine cleaned with zero foreign matter."
            },
            {
                "farmer": "Balwinder Singh Dhillon",
                "crop_name": "Pili Sarson / Mustard (सरसों / ସୋରିଷ)",
                "variety": "Giriraj Yellow Seed",
                "quality_grade": "Grade A",
                "quantity": 45.0,
                "unit": "quintal",
                "price_per_unit": 5400.0,
                "location_city": "Karnal",
                "location_state": "Haryana",
                "description": "Pure mustard seeds for cold-pressed kachi ghani oil milling."
            },
            {
                "farmer": "Subrat Narayan Jena",
                "crop_name": "Fresh Green Chili (हरी मिर्च / କଞ୍ଚା ଲଙ୍କା)",
                "variety": "G4 Bullet Sharp",
                "quality_grade": "Grade A",
                "quantity": 30.0,
                "unit": "quintal",
                "price_per_unit": 3600.0,
                "location_city": "Cuttack",
                "location_state": "Odisha",
                "description": "Crisp spicy green chilies plucked yesterday morning, crated for transport."
            }
        ]

        added_count = 0
        for ld in listings_data:
            farmer = farmer_models.get(ld["farmer"])
            if not farmer:
                continue

            existing_listing = db.query(CropListing).filter(
                CropListing.farmer_id == farmer.id,
                CropListing.crop_name == ld["crop_name"]
            ).first()

            if not existing_listing:
                listing = CropListing(
                    farmer_id=farmer.id,
                    crop_name=ld["crop_name"],
                    variety=ld["variety"],
                    quality_grade=ld["quality_grade"],
                    quantity=ld["quantity"],
                    unit=ld["unit"],
                    price_per_unit=ld["price_per_unit"],
                    location_city=ld["location_city"],
                    location_state=ld["location_state"],
                    is_active=True
                )
                db.add(listing)
                added_count += 1

        db.commit()
        print(f"Successfully seeded {added_count} produce listings and {len(farmer_models)} farmer profiles.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_marketplace()
