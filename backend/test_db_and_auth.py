"""
Test script to verify Backend FastAPI modules, SQLAlchemy models, Pydantic schemas,
Bcrypt hashing, and JWT token generation.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

def test_imports_and_schemas():
    print("Testing backend imports...")
    from app.config import settings
    from app.database import Base, engine, get_db
    import app.models as models
    import app.schemas as schemas
    from app.security import get_password_hash, verify_password, create_access_token
    from main import app
    print("[OK] All modules imported successfully.")

    # 1. Test Password Hashing
    password = "FarmerPassword#123"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed), "Password verification failed"
    assert not verify_password("WrongPassword", hashed), "Invalid password check failed"
    print("[OK] Password hashing & bcrypt verification passed.")

    # 2. Test JWT Token Generation
    user_id = 42
    token = create_access_token(subject=str(user_id))
    assert token and isinstance(token, str), "Token generation failed"
    print("[OK] JWT Token generation passed.")

    # 3. Test Pydantic Schemas Validation
    reg_data = schemas.UserRegisterRequest(
        mobile="9876543210",
        password="MySecretPassword123",
        language="english",
        role="farmer"
    )
    assert reg_data.mobile == "9876543210"
    # 4. Test Database Table Initialization
    from app.database import init_db
    init_db()
    print("[OK] Database tables verified and created.")

    print("\n--- All Backend Auth & Database Components Verified Successfully! ---")

if __name__ == "__main__":
    test_imports_and_schemas()
