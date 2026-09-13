import re
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class UserRegisterRequest(BaseModel):
    """
    Schema for step 1 of user registration (from onboarding.html).
    """
    full_name: Optional[str] = Field(default="Farmer User", max_length=100, description="Full Name of the Farmer/User")
    mobile: str = Field(..., description="10-digit Indian mobile number")
    password: str = Field(..., min_length=4, max_length=128, description="User password")
    language: str = Field(default="english", description="Preferred language (english / hindi)")
    role: Optional[str] = Field(default="farmer", description="Role: farmer | buyer | partner")
    otp: Optional[str] = Field(default=None, description="Verification OTP code if requested")
    
    # Address & Settlement fields
    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    pincode: Optional[str] = Field(default=None, pattern=r"^\d{6}$")
    state: Optional[str] = Field(default=None, max_length=100)
    upi_id: Optional[str] = Field(default=None, max_length=100)

    # Role-specific fields
    aadhar_number: Optional[str] = Field(default=None, max_length=20)
    farm_location: Optional[str] = Field(default=None, max_length=255)
    primary_crops: Optional[str] = Field(default=None, max_length=255)
    buyer_type: Optional[Literal["individual", "bulk", "institutional"]] = None
    gstin: Optional[str] = Field(default=None, max_length=50)
    vehicle_details: Optional[str] = Field(default=None, max_length=255)
    service_area: Optional[str] = Field(default=None, max_length=255)
    capacity: Optional[str] = Field(default=None, max_length=100)

    @field_validator(
        "address_line1", "address_line2", "city", "pincode", "state",
        "upi_id", "aadhar_number", "farm_location", "primary_crops",
        "buyer_type", "gstin", "vehicle_details", "service_area", "capacity", "otp",
        mode="before"
    )
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> str:
        if not v:
            return "farmer"
        cleaned = v.strip().lower()
        if cleaned not in {"farmer", "buyer", "partner"}:
            raise ValueError("Role must be one of: farmer, buyer, partner")
        return cleaned


class UserProfileCompleteRequest(BaseModel):
    """
    Schema for step 2 of user registration: address & payout details (from details.html).
    Enforces conditional role-based verification.
    """
    user_id: Optional[int] = Field(default=None, description="User ID if not using Bearer Token")
    full_name: Optional[str] = Field(default=None, max_length=100, description="Full Name if updated")
    address_line1: str = Field(..., min_length=2, max_length=255, description="House No / Street")
    address_line2: Optional[str] = Field(default=None, max_length=255, description="Village / Area / Landmark")
    city: str = Field(..., min_length=2, max_length=100, description="City / District")
    pincode: str = Field(..., pattern=r"^\d{6}$", description="6-digit Indian PIN code")
    state: str = Field(..., min_length=2, max_length=100, description="State name")
    upi_id: str = Field(..., min_length=3, max_length=100, description="UPI ID for settlements")
    aadhar_number: Optional[str] = Field(default=None, description="Aadhaar verification number (Required for Farmer)")
    aadhar: Optional[str] = Field(default=None, description="Alternative field name for Aadhaar")

    # Role-Specific optional fields
    buyer_type: Optional[Literal["individual", "bulk", "institutional"]] = Field(default=None, description="individual / bulk / institutional")
    gstin: Optional[str] = Field(default=None, max_length=50, description="Optional GSTIN for businesses")
    farm_location: Optional[str] = Field(default=None, max_length=255, description="Farm size or village location")
    primary_crops: Optional[str] = Field(default=None, max_length=255, description="Comma-separated primary crops")
    vehicle_details: Optional[str] = Field(default=None, max_length=255, description="Vehicle / fleet info for partner")
    service_area: Optional[str] = Field(default=None, max_length=255, description="Operating districts / cities")
    capacity: Optional[str] = Field(default=None, max_length=100, description="Payload capacity (e.g. 5 Ton truck)")


class UserLoginPasswordRequest(BaseModel):
    """
    Schema for logging in using mobile number and password (from login.html).
    """
    mobile: str = Field(..., description="10-digit registered mobile number")
    password: str = Field(..., description="User password")
    remember_me: Optional[bool] = Field(default=True)

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned


class OTPSendRequest(BaseModel):
    """
    Schema for requesting an OTP code.
    """
    mobile: str = Field(..., description="10-digit mobile number")

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned


class OTPLoginRequest(BaseModel):
    """
    Schema for logging in using OTP (from login.html).
    """
    mobile: str = Field(..., description="10-digit mobile number")
    otp_code: str = Field(..., min_length=4, max_length=6, description="6-digit OTP code")

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned


class UserProfileUpdateRequest(BaseModel):
    """
    Schema for updating user profile fields from profile.html.
    All fields are optional to support partial/inline edits.
    """
    full_name: Optional[str] = Field(default=None, max_length=100)
    language_preference: Optional[str] = Field(default=None, max_length=50)
    mobile_number: Optional[str] = Field(default=None)
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)
    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    pincode: Optional[str] = Field(default=None, pattern=r"^\d{6}$")
    state: Optional[str] = Field(default=None, max_length=100)
    upi_id: Optional[str] = Field(default=None, max_length=100)
    aadhar_number: Optional[str] = Field(default=None, max_length=20)

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if not re.match(r"^[\w.-]{2,100}@[a-zA-Z]{2,64}$", cleaned):
            raise ValueError("Invalid UPI ID. Format should be username@bank (e.g. 9876543210@ybl)")
        return cleaned

    @field_validator("aadhar_number")
    @classmethod
    def validate_aadhar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 12:
            raise ValueError("Aadhaar number must be exactly 12 numeric digits")
        return cleaned


class UserResponse(BaseModel):
    """
    Public User model response.
    """
    id: int
    full_name: Optional[str] = None
    mobile_number: str
    language_preference: str
    role: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    state: Optional[str] = None
    upi_id: Optional[str] = None
    aadhar_number: Optional[str] = None
    buyer_type: Optional[str] = None
    gstin: Optional[str] = None
    farm_location: Optional[str] = None
    primary_crops: Optional[str] = None
    vehicle_details: Optional[str] = None
    service_area: Optional[str] = None
    capacity: Optional[str] = None
    is_profile_completed: bool
    is_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """
    Token payload returned upon successful registration/login.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """
    Generic message response schema.
    """
    success: bool = True
    message: str
    data: Optional[dict] = None


# --------------------------------------------------------------------------
# Crop Listing Marketplace Schemas
# --------------------------------------------------------------------------
class CropListingCreate(BaseModel):
    """
    Payload for creating a new crop listing (Farmer only).
    """
    crop_name: str = Field(..., min_length=2, max_length=100, description="Name of crop (e.g. Wheat, Tomato, Onion)")
    variety: Optional[str] = Field(default=None, max_length=100, description="Specific variety (e.g. Sharbati, Desi)")
    quantity: float = Field(..., gt=0, description="Available quantity")
    unit: str = Field(default="quintal", max_length=20, description="Unit: kg, quintal, ton")
    price_per_unit: float = Field(..., gt=0, description="Price in INR per unit")
    quality_grade: Optional[Literal["Grade A", "Grade B", "Grade C"]] = Field(default="Grade A", description="Quality grade (Grade A / B / C)")
    location_city: Optional[str] = Field(default=None, max_length=100, description="City / Mandi location")
    location_state: Optional[str] = Field(default=None, max_length=100, description="State")


class CropListingFarmerSummary(BaseModel):
    """
    Lightweight farmer profile embedded in listing responses.
    """
    id: int
    full_name: Optional[str] = None
    mobile_number: str
    city: Optional[str] = None
    state: Optional[str] = None
    farm_location: Optional[str] = None

    class Config:
        from_attributes = True


class CropListingResponse(BaseModel):
    """
    Detailed crop listing response.
    """
    id: int
    farmer_id: int
    crop_name: str
    variety: Optional[str] = None
    quantity: float
    unit: str
    price_per_unit: float
    quality_grade: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    is_active: bool
    created_at: datetime
    farmer: Optional[CropListingFarmerSummary] = None

    class Config:
        from_attributes = True


class CropListingPaginationResponse(BaseModel):
    """
    Paginated response for marketplace discovery listing queries.
    """
    items: list[CropListingResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
