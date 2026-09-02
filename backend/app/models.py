from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base


class User(Base):
    """
    SQLAlchemy User model storing account credentials, language preference,
    role, address, and payout information.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
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
    
    # Payment / Settlement Details
    upi_id = Column(String(100), nullable=True)
    
    # Flags & Timestamps
    is_profile_completed = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

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
