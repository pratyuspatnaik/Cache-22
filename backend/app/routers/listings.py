import math
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
import app.models as models
import app.schemas as schemas
from app.security import get_current_active_user, get_current_user

router = APIRouter(prefix="/listings", tags=["Crop Marketplace Listings"])


def mask_phone_number(phone: Optional[str]) -> str:
    """
    Masks a phone number for public endpoints (e.g. 9812345678 -> 98XXXXXX78).
    """
    if not phone:
        return "98XXXXXX00"
    cleaned = re.sub(r"\D", "", phone)
    if len(cleaned) >= 10:
        return f"{cleaned[:2]}XXXXXX{cleaned[-2:]}"
    elif len(cleaned) >= 4:
        return f"{cleaned[:2]}XXXX{cleaned[-2:]}"
    return "XXXXXXXXXX"


def format_listing_response(listing: models.CropListing, mask_farmer_phone: bool = True) -> schemas.CropListingResponse:
    """
    Constructs a CropListingResponse, conditionally masking the farmer's contact number.
    """
    farmer_data = None
    if listing.farmer:
        phone = mask_phone_number(listing.farmer.mobile_number) if mask_farmer_phone else listing.farmer.mobile_number
        farmer_data = schemas.CropListingFarmerSummary(
            id=listing.farmer.id,
            full_name=listing.farmer.full_name,
            mobile_number=phone,
            city=listing.farmer.city,
            state=listing.farmer.state,
            farm_location=listing.farmer.farm_location
        )

    return schemas.CropListingResponse(
        id=listing.id,
        farmer_id=listing.farmer_id,
        crop_name=listing.crop_name,
        variety=listing.variety,
        quantity=listing.quantity,
        unit=listing.unit,
        price_per_unit=listing.price_per_unit,
        quality_grade=listing.quality_grade,
        location_city=listing.location_city,
        location_state=listing.location_state,
        is_active=listing.is_active,
        created_at=listing.created_at,
        farmer=farmer_data
    )


# --------------------------------------------------------------------------
# 1. Create Crop Listing (Farmer Only)
# --------------------------------------------------------------------------
@router.post("", response_model=schemas.CropListingResponse, status_code=status.HTTP_201_CREATED)
def create_crop_listing(
    payload: schemas.CropListingCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new marketplace crop listing.
    Only authenticated users with role='farmer' are permitted.
    """
    if current_user.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only registered farmers can post crop listings."
        )

    if not current_user.is_profile_completed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile incomplete: Farmers must complete Aadhaar verification and profile details before posting crop listings."
        )

    if payload.price_per_unit <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Price per unit must be greater than 0."
        )

    if payload.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity must be greater than 0."
        )

    # Use user's profile location if not specified in listing
    city = payload.location_city or current_user.city or "Local Mandi"
    state = payload.location_state or current_user.state or "India"

    listing = models.CropListing(
        farmer_id=current_user.id,
        crop_name=payload.crop_name.strip(),
        variety=payload.variety.strip() if payload.variety else None,
        quantity=payload.quantity,
        unit=payload.unit.strip().lower(),
        price_per_unit=payload.price_per_unit,
        quality_grade=payload.quality_grade or "Grade A",
        location_city=city,
        location_state=state,
        is_active=True
    )

    db.add(listing)
    db.commit()
    db.refresh(listing)

    return format_listing_response(listing, mask_farmer_phone=False)


# --------------------------------------------------------------------------
# 2. Browse & Search Crop Listings (Public Marketplace)
# --------------------------------------------------------------------------
@router.get("", response_model=schemas.CropListingPaginationResponse)
def get_crop_listings(
    crop: Optional[str] = Query(None, description="Search by crop name or variety"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    location: Optional[str] = Query(None, description="City or state location filter"),
    min_quantity: Optional[float] = Query(None, ge=0, description="Minimum quantity in stock"),
    quality_grade: Optional[str] = Query(None, description="Grade A, Grade B, etc."),
    sort: Optional[str] = Query("newest", description="Sorting: newest | price_asc | price_desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Search and filter active crop listings in the KrishiMandi marketplace.
    Public endpoint: Farmer phone numbers are masked to prevent unauthorized scraping.
    """
    query = db.query(models.CropListing).options(
        joinedload(models.CropListing.farmer)
    ).filter(models.CropListing.is_active == True)

    # Filter: Crop name or variety
    if crop:
        clean_crop = f"%{crop.strip()}%"
        query = query.filter(
            or_(
                models.CropListing.crop_name.ilike(clean_crop),
                models.CropListing.variety.ilike(clean_crop)
            )
        )

    # Filter: Price range
    if min_price is not None:
        query = query.filter(models.CropListing.price_per_unit >= min_price)
    if max_price is not None:
        query = query.filter(models.CropListing.price_per_unit <= max_price)

    # Filter: Location (City or State)
    if location:
        clean_loc = f"%{location.strip()}%"
        query = query.filter(
            or_(
                models.CropListing.location_city.ilike(clean_loc),
                models.CropListing.location_state.ilike(clean_loc)
            )
        )

    # Filter: Minimum quantity
    if min_quantity is not None:
        query = query.filter(models.CropListing.quantity >= min_quantity)

    # Filter: Quality Grade
    if quality_grade:
        query = query.filter(models.CropListing.quality_grade.ilike(f"%{quality_grade.strip()}%"))

    # Sorting
    if sort == "price_asc":
        query = query.order_by(asc(models.CropListing.price_per_unit))
    elif sort == "price_desc":
        query = query.order_by(desc(models.CropListing.price_per_unit))
    else:
        query = query.order_by(desc(models.CropListing.created_at))

    total_count = query.count()
    total_pages = max(1, math.ceil(total_count / page_size))
    offset = (page - 1) * page_size

    raw_items = query.offset(offset).limit(page_size).all()
    # Mask farmer mobile numbers in public browse list
    formatted_items = [format_listing_response(item, mask_farmer_phone=True) for item in raw_items]

    return schemas.CropListingPaginationResponse(
        items=formatted_items,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# --------------------------------------------------------------------------
# 3. Single Listing Detail
# --------------------------------------------------------------------------
@router.get("/{listing_id}", response_model=schemas.CropListingResponse)
def get_crop_listing_detail(
    listing_id: int,
    full: bool = Query(False, description="Request unmasked contact details (requires authenticated user)"),
    current_user: Optional[models.User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full details for a single crop listing.
    When unauthenticated or full=false, the farmer's mobile number is masked (e.g. 98XXXXXX10).
    When full=true is specified, the user must be authenticated, otherwise returns 401 Unauthorized.
    """
    listing = db.query(models.CropListing).options(
        joinedload(models.CropListing.farmer)
    ).filter(
        models.CropListing.id == listing_id,
        models.CropListing.is_active == True
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop listing not found or has been sold/deactivated."
        )

    if full:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view farmer contact details. Please log in.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return format_listing_response(listing, mask_farmer_phone=False)

    return format_listing_response(listing, mask_farmer_phone=True)


# --------------------------------------------------------------------------
# 4. Deactivate / Delete Listing (Owner Farmer Only)
# --------------------------------------------------------------------------
@router.delete("/{listing_id}", response_model=schemas.MessageResponse)
def delete_crop_listing(
    listing_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deactivates a crop listing. Can only be performed by the farmer who posted it.
    """
    listing = db.query(models.CropListing).filter(models.CropListing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop listing not found."
        )

    if listing.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to remove this listing."
        )

    listing.is_active = False
    db.commit()

    return schemas.MessageResponse(
        success=True,
        message="Crop listing successfully deactivated."
    )
