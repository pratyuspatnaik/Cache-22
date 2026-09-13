from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """
    SQLAlchemy User model storing account credentials, language preference,
    role (farmer | buyer | partner), address, payout, and role-specific details.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), default="Farmer User", nullable=True)
    mobile_number = Column(String(15), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    language_preference = Column(String(20), default="english", nullable=False)
    role = Column(String(50), default="farmer", nullable=False)
    
    # Address Details (from details.html)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    state = Column(String(100), nullable=True)
    
    # Payment & Identity Details
    upi_id = Column(String(100), nullable=True)
    aadhar_number = Column(String(20), nullable=True)  # Required for Farmer

    # Role-Specific Details
    # Buyer Fields:
    buyer_type = Column(String(50), nullable=True)  # individual / bulk / institutional
    gstin = Column(String(50), nullable=True)       # Optional GSTIN for businesses

    # Farmer Fields:
    farm_location = Column(String(255), nullable=True)
    primary_crops = Column(String(255), nullable=True)

    # Partner / Logistics Fields:
    vehicle_details = Column(String(255), nullable=True)
    service_area = Column(String(255), nullable=True)
    capacity = Column(String(100), nullable=True)
    
    # Flags & Timestamps
    is_profile_completed = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    crop_listings = relationship("CropListing", back_populates="farmer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} mobile={self.mobile_number} role={self.role}>"


class OTPRecord(Base):
    """
    Stores verification OTPs generated for SMS verification during registration & login.
    """
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    mobile_number = Column(String(15), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<OTPRecord mobile={self.mobile_number} code={self.otp_code} used={self.is_used}>"


class CropListing(Base):
    """
    Crop listings created by farmers for the direct agricultural marketplace.
    """
    __tablename__ = "crop_listings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    farmer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    crop_name = Column(String(100), nullable=False, index=True)
    variety = Column(String(100), nullable=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, default="quintal")  # kg, quintal, ton
    price_per_unit = Column(Float, nullable=False)
    quality_grade = Column(String(20), nullable=True, default="Grade A")
    location_city = Column(String(100), nullable=True)
    location_state = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    farmer = relationship("User", back_populates="crop_listings")

    def __repr__(self):
        return f"<CropListing id={self.id} crop={self.crop_name} price={self.price_per_unit}/{self.unit}>"
