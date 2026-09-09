from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Role = Literal["farmer", "buyer"]
Source = Literal["CAMERA", "IMAGE_UPLOAD"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = "farmer"
    organization: Optional[str] = Field(default="", max_length=120)
    phone: Optional[str] = Field(default="", max_length=20, pattern=r"^(\+?[0-9]{8,15})?$")


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    organization: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=20, pattern=r"^(\+?[0-9]{8,15})?$")


class BatchCreate(BaseModel):
    variety: str = Field(min_length=2, max_length=60)
    quantity: float = Field(gt=0, le=10_000_000)
    unit: Literal["kg", "tonnes"] = "kg"
    supplier_name: str = Field(min_length=2, max_length=120)
    procurement_center: str = Field(min_length=2, max_length=160)
    storage_location: Optional[str] = Field(default="", max_length=160)
    inspection_date: Optional[str] = Field(default=None, max_length=32)
    notes: Optional[str] = Field(default="", max_length=600)


class BatchUpdate(BaseModel):
    variety: Optional[str] = Field(default=None, min_length=2, max_length=60)
    quantity: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    unit: Optional[Literal["kg", "tonnes"]] = None
    supplier_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    procurement_center: Optional[str] = Field(default=None, min_length=2, max_length=160)
    storage_location: Optional[str] = Field(default=None, max_length=160)
    inspection_date: Optional[str] = Field(default=None, max_length=32)
    notes: Optional[str] = Field(default=None, max_length=600)


class AnalyzeIn(BaseModel):
    images: List[str] = Field(min_length=1, max_length=6)
    source: Source


class InspectionCreate(BaseModel):
    analysis_id: str = Field(min_length=8, max_length=64)
    batch_id: str = Field(min_length=3, max_length=32)
    notes: Optional[str] = Field(default="", max_length=600)
    inspection_day: Optional[int] = Field(default=None, ge=1, le=365)


class VerifyInspectionIn(BaseModel):
    status: Literal["VERIFIED", "REJECTED"]
    remarks: Optional[str] = Field(default="", max_length=400)


class StorageNoteIn(BaseModel):
    notes: str = Field(min_length=1, max_length=500)
    day: Optional[int] = Field(default=None, ge=1, le=365)


class DispatchVerifyIn(BaseModel):
    status: Literal["APPROVED", "REINSPECTION_REQUIRED"]
    remarks: Optional[str] = Field(default="", max_length=400)
