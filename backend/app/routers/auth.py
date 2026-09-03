import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
import app.models as models
import app.schemas as schemas
from app.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_active_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --------------------------------------------------------------------------
# 1. User Registration (Step 1 - Onboarding)
# --------------------------------------------------------------------------
@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: schemas.UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new farmer or buyer account with mobile number and password.
    """
    # Check if mobile number already exists
    existing_user = db.query(models.User).filter(models.User.mobile_number == payload.mobile).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered. Please log in instead."
        )

    # Hash the password securely
    hashed_pwd = get_password_hash(payload.password)

    # Create new user record
    new_user = models.User(
        mobile_number=payload.mobile,
        hashed_password=hashed_pwd,
        language_preference=payload.language or "english",
        role=payload.role or "farmer",
        is_profile_completed=False,
        is_verified=True,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT access token
    access_token = create_access_token(subject=str(new_user.id))

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=new_user
    )


# --------------------------------------------------------------------------
# 2. Complete Profile (Step 2 - Details & Payout)
# --------------------------------------------------------------------------
@router.post("/complete-profile", response_model=schemas.UserResponse)
def complete_user_profile(
    payload: schemas.UserProfileCompleteRequest,
    current_user: Optional[models.User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete user profile with address and UPI payment settlement information.
    Accepts either an authenticated JWT user or user_id in payload.
    """
    user = None
    if current_user:
        user = current_user
    elif payload.user_id:
        user = db.query(models.User).filter(models.User.id == payload.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or session expired. Please log in or register again."
        )

    # Update address & payment fields
    user.address_line1 = payload.address_line1
    user.address_line2 = payload.address_line2
    user.city = payload.city
    user.pincode = payload.pincode
    user.state = payload.state
    user.upi_id = payload.upi_id
    if payload.aadhar_number:
        user.aadhar_number = payload.aadhar_number
    elif payload.aadhar:
        user.aadhar_number = payload.aadhar
    user.is_profile_completed = True
    user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------------------------------
# 3. User Login (Password Mode)
# --------------------------------------------------------------------------
@router.post("/login", response_model=schemas.TokenResponse)
def login_with_password(
    payload: schemas.UserLoginPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user using mobile number and password.
    """
    user = db.query(models.User).filter(models.User.mobile_number == payload.mobile).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password"
        )

    if not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently suspended or inactive"
        )

    # Generate token
    expires_delta = timedelta(days=7) if payload.remember_me else None
    access_token = create_access_token(subject=str(user.id), expires_delta=expires_delta)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


# --------------------------------------------------------------------------
# 4. Request / Send OTP (SMS simulation)
# --------------------------------------------------------------------------
@router.post("/otp/send", response_model=schemas.MessageResponse)
def send_otp(
    payload: schemas.OTPSendRequest,
    db: Session = Depends(get_db)
):
    """
    Generates and stores a 6-digit OTP code with 5-minute expiration.
    In development, returns the OTP in response data for easy testing.
    """
    # Invalidate previous unused OTPs for this mobile
    db.query(models.OTPRecord).filter(
        models.OTPRecord.mobile_number == payload.mobile,
        models.OTPRecord.is_used == False
    ).update({"is_used": True})

    # Generate a random 6-digit numeric OTP
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_record = models.OTPRecord(
        mobile_number=payload.mobile,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    print(f"\n[KrishiMandi SMS Gateway] -> Sent OTP {otp_code} to +91-{payload.mobile} (valid for 5 mins)\n")

    return schemas.MessageResponse(
        success=True,
        message=f"OTP sent successfully to +91-{payload.mobile}",
        data={"otp_code": otp_code, "expires_in_seconds": 300}
    )


# --------------------------------------------------------------------------
# 5. User Login (OTP Mode)
# --------------------------------------------------------------------------
@router.post("/otp/login", response_model=schemas.TokenResponse)
def login_with_otp(
    payload: schemas.OTPLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user using mobile number and SMS OTP code.
    If the user does not exist yet, creates a verified account automatically.
    """
    # Check for valid OTP in database or master demo code '123456'
    is_valid_otp = False

    if payload.otp_code == "123456":
        is_valid_otp = True
    else:
        now = datetime.utcnow()
        otp_record = db.query(models.OTPRecord).filter(
            models.OTPRecord.mobile_number == payload.mobile,
            models.OTPRecord.otp_code == payload.otp_code,
            models.OTPRecord.is_used == False,
            models.OTPRecord.expires_at >= now
        ).first()

        if otp_record:
            is_valid_otp = True
            otp_record.is_used = True
            db.commit()

    if not is_valid_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please request a new one."
        )

    # Check if user exists; if not, auto-create a user profile
    user = db.query(models.User).filter(models.User.mobile_number == payload.mobile).first()
    if not user:
        user = models.User(
            mobile_number=payload.mobile,
            language_preference="english",
            role="farmer",
            is_profile_completed=False,
            is_verified=True,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(subject=str(user.id))

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


# --------------------------------------------------------------------------
# 6. Current Authenticated User Profile
# --------------------------------------------------------------------------
@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Retrieve the current logged-in user profile details.
    """
    return current_user
