import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserRegisterRequest(BaseModel):
    """
    Schema for step 1 of user registration (from onboarding.html).
    """
    full_name: Optional[str] = Field(default="Farmer User", max_length=100, description="Full Name of the Farmer/User")
    mobile: str = Field(..., description="10-digit Indian mobile number")
    password: str = Field(..., min_length=4, max_length=128, description="User password")
    language: str = Field(default="english", description="Preferred language (english / hindi)")
    role: Optional[str] = Field(default="farmer", description="Role: farmer / buyer")
    otp: Optional[str] = Field(default=None, description="Verification OTP code if requested")

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return cleaned


class UserProfileCompleteRequest(BaseModel):
    """
    Schema for step 2 of user registration: address & payout details (from details.html).
    """
    user_id: Optional[int] = Field(default=None, description="User ID if not using Bearer Token")
    full_name: Optional[str] = Field(default=None, max_length=100, description="Full Name if updated")
    address_line1: str = Field(..., min_length=2, max_length=255, description="House No / Street")
    address_line2: Optional[str] = Field(default=None, max_length=255, description="Village / Area / Landmark")
    city: str = Field(..., min_length=2, max_length=100, description="City / District")
    pincode: str = Field(..., pattern=r"^\d{6}$", description="6-digit Indian PIN code")
    state: str = Field(..., min_length=2, max_length=100, description="State name")
    upi_id: str = Field(..., min_length=3, max_length=100, description="UPI ID for settlements")
    aadhar_number: Optional[str] = Field(default=None, description="Aadhaar verification number")
    aadhar: Optional[str] = Field(default=None, description="Alternative field name for Aadhaar")


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
