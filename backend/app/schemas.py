import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserRegisterRequest(BaseModel):
    """
    Schema for step 1 of user registration (from onboarding.html).
    """
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


class UserResponse(BaseModel):
    """
    Public User model response.
    """
    id: int
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
